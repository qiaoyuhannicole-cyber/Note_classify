import Dexie, { type EntityTable } from 'dexie'
import type {
  Question,
  AnswerPerspective,
  Category,
  QuestionRelation,
  GraphLayout,
  Settings,
} from '@/types/notebook'

// 定义数据库
class NotebookDatabase extends Dexie {
  questions!: EntityTable<Question, 'id'>
  perspectives!: EntityTable<AnswerPerspective, 'id'>
  categories!: EntityTable<Category, 'id'>
  relations!: EntityTable<QuestionRelation, 'id'>
  layouts!: EntityTable<GraphLayout, 'questionId'>
  settings!: EntityTable<Settings, 'key'>

  constructor() {
    super('NotebookDB')
    
    this.version(1).stores({
      questions: 'id, categoryId, createdAt, updatedAt, text',
      perspectives: 'id, questionId, order, createdAt',
      categories: 'id, name, createdAt',
      relations: 'id, sourceId, targetId, type, createdAt',
      layouts: 'questionId',
      settings: 'key',
    })
  }
}

export const db = new NotebookDatabase()

// 生成 UUID
export function generateId(): string {
  return crypto.randomUUID()
}

// ============ 问题操作 ============

export async function createQuestion(
  text: string, 
  categoryId: string | null = null,
  initialAnswer?: string
): Promise<Question> {
  const now = new Date()
  const question: Question = {
    id: generateId(),
    text: text.trim(),
    categoryId,
    createdAt: now,
    updatedAt: now,
  }
  
  await db.questions.add(question)
  
  // 自动创建主答案角度，如果有初始答案则填入
  const perspective = await createPerspective(question.id, '主答案', true)
  if (initialAnswer) {
    await updatePerspective(perspective.id, { content: initialAnswer })
  }
  
  // 更新分类问题数量
  if (categoryId) {
    await updateCategoryCount(categoryId)
  }
  
  return question
}

export async function updateQuestion(id: string, updates: Partial<Pick<Question, 'text' | 'categoryId' | 'embedding'>>): Promise<void> {
  const question = await db.questions.get(id)
  if (!question) return
  
  const oldCategoryId = question.categoryId
  
  await db.questions.update(id, {
    ...updates,
    updatedAt: new Date(),
  })
  
  // 更新分类计数
  if (updates.categoryId !== undefined && updates.categoryId !== oldCategoryId) {
    if (oldCategoryId) await updateCategoryCount(oldCategoryId)
    if (updates.categoryId) await updateCategoryCount(updates.categoryId)
  }
}

export async function deleteQuestion(id: string): Promise<void> {
  const question = await db.questions.get(id)
  if (!question) return
  
  // 删除关联的答案角度
  await db.perspectives.where('questionId').equals(id).delete()
  
  // 删除关联的关系
  await db.relations.where('sourceId').equals(id).delete()
  await db.relations.where('targetId').equals(id).delete()
  
  // 删除布局缓存
  await db.layouts.delete(id)
  
  // 删除问题
  await db.questions.delete(id)
  
  // 更新分类计数
  if (question.categoryId) {
    await updateCategoryCount(question.categoryId)
  }
}

export async function getQuestion(id: string): Promise<Question | undefined> {
  return db.questions.get(id)
}

export async function getAllQuestions(): Promise<Question[]> {
  return db.questions.orderBy('updatedAt').reverse().toArray()
}

export async function getQuestionsByCategory(categoryId: string | null): Promise<Question[]> {
  if (categoryId === null) {
    const emptyCategory = await db.questions.where('categoryId').equals('').toArray()
    const nullCategory = await db.questions.filter(q => q.categoryId === null).toArray()
    return [...emptyCategory, ...nullCategory]
  }
  return db.questions.where('categoryId').equals(categoryId).toArray()
}

export async function checkDuplicateQuestion(text: string, excludeId?: string): Promise<Question | null> {
  // 标准化文本：去除首尾空格，统一标点
  const normalizedText = text.trim().toLowerCase()
    .replace(/[？?！!。.，,、；;：:""''「」『』【】]/g, '')
    .replace(/\s+/g, '')
  
  const questions = await db.questions.toArray()
  
  for (const q of questions) {
    if (excludeId && q.id === excludeId) continue
    
    const normalizedQ = q.text.trim().toLowerCase()
      .replace(/[？?！!。.，,、；;：:""''「」『』【】]/g, '')
      .replace(/\s+/g, '')
    
    if (normalizedQ === normalizedText) {
      return q
    }
  }
  
  return null
}

// ============ 答案角度操作 ============

export async function createPerspective(
  questionId: string,
  label: string,
  isMain: boolean = false
): Promise<AnswerPerspective> {
  const existingPerspectives = await db.perspectives.where('questionId').equals(questionId).toArray()
  const now = new Date()
  
  const perspective: AnswerPerspective = {
    id: generateId(),
    questionId,
    label,
    content: '',
    images: [],
    order: existingPerspectives.length,
    isMain,
    createdAt: now,
    updatedAt: now,
  }
  
  await db.perspectives.add(perspective)
  return perspective
}

export async function updatePerspective(
  id: string,
  updates: Partial<Pick<AnswerPerspective, 'label' | 'content' | 'images' | 'order'>>
): Promise<void> {
  await db.perspectives.update(id, {
    ...updates,
    updatedAt: new Date(),
  })
}

export async function deletePerspective(id: string): Promise<void> {
  const perspective = await db.perspectives.get(id)
  if (!perspective || perspective.isMain) return // 不允许删除主答案
  
  await db.perspectives.delete(id)
  
  // 重新排序剩余角度
  const remaining = await db.perspectives
    .where('questionId')
    .equals(perspective.questionId)
    .sortBy('order')
  
  for (let i = 0; i < remaining.length; i++) {
    await db.perspectives.update(remaining[i].id, { order: i })
  }
}

export async function getPerspectivesByQuestion(questionId: string): Promise<AnswerPerspective[]> {
  return db.perspectives.where('questionId').equals(questionId).sortBy('order')
}

// 计算问题完成度
export async function calculateCompletion(questionId: string): Promise<number> {
  const perspectives = await getPerspectivesByQuestion(questionId)
  if (perspectives.length === 0) return 0
  
  const filled = perspectives.filter(p => 
    p.content.trim() !== '' || p.images.length > 0
  ).length
  
  return filled / perspectives.length
}

// ============ 分类操作 ============

export async function createCategory(name: string, description?: string, color?: string): Promise<Category> {
  // 检查是否已存在同名分类
  const trimmedName = name.trim()
  const existingCategories = await db.categories.toArray()
  const existing = existingCategories.find(
    c => c.name.toLowerCase() === trimmedName.toLowerCase()
  )
  
  if (existing) {
    return existing
  }
  
  const now = new Date()
  const category: Category = {
    id: generateId(),
    name: trimmedName,
    description,
    color: color || generateCategoryColor(),
    questionCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  
  await db.categories.add(category)
  return category
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<Category, 'name' | 'description' | 'color' | 'representativeEmbedding'>>
): Promise<void> {
  await db.categories.update(id, {
    ...updates,
    updatedAt: new Date(),
  })
}

export async function deleteCategory(id: string): Promise<void> {
  // 将该分类下的问题移动到未分类
  await db.questions.where('categoryId').equals(id).modify({ categoryId: null })
  await db.categories.delete(id)
}

export async function getCategory(id: string): Promise<Category | undefined> {
  return db.categories.get(id)
}

export async function getAllCategories(): Promise<Category[]> {
  return db.categories.orderBy('name').toArray()
}

async function updateCategoryCount(categoryId: string): Promise<void> {
  const count = await db.questions.where('categoryId').equals(categoryId).count()
  await db.categories.update(categoryId, { questionCount: count })
}

function generateCategoryColor(): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// ============ 关系操作 ============

export async function createRelation(
  sourceId: string,
  targetId: string,
  type: QuestionRelation['type'] = 'extension',
  note?: string
): Promise<QuestionRelation | null> {
  // 检查是否已存在相同关系
  const existing = await db.relations
    .where('sourceId').equals(sourceId)
    .filter(r => r.targetId === targetId)
    .first()
  
  if (existing) return null
  
  // 也检查反向关系
  const reverseExisting = await db.relations
    .where('sourceId').equals(targetId)
    .filter(r => r.targetId === sourceId)
    .first()
  
  if (reverseExisting) return null
  
  const relation: QuestionRelation = {
    id: generateId(),
    sourceId,
    targetId,
    type,
    note,
    createdAt: new Date(),
  }
  
  await db.relations.add(relation)
  return relation
}

export async function updateRelation(
  id: string,
  updates: Partial<Pick<QuestionRelation, 'type' | 'note'>>
): Promise<void> {
  await db.relations.update(id, updates)
}

export async function deleteRelation(id: string): Promise<void> {
  await db.relations.delete(id)
}

export async function getRelationsByQuestion(questionId: string): Promise<QuestionRelation[]> {
  const asSource = await db.relations.where('sourceId').equals(questionId).toArray()
  const asTarget = await db.relations.where('targetId').equals(questionId).toArray()
  return [...asSource, ...asTarget]
}

export async function getAllRelations(): Promise<QuestionRelation[]> {
  return db.relations.toArray()
}

// ============ 图谱布局操作 ============

export async function saveLayout(questionId: string, x: number, y: number): Promise<void> {
  await db.layouts.put({ questionId, x, y })
}

export async function getLayout(questionId: string): Promise<GraphLayout | undefined> {
  return db.layouts.get(questionId)
}

export async function getAllLayouts(): Promise<GraphLayout[]> {
  return db.layouts.toArray()
}

export async function clearLayouts(): Promise<void> {
  await db.layouts.clear()
}

// ============ 设置操作 ============

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const setting = await db.settings.get(key)
  return setting ? (setting.value as T) : defaultValue
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await db.settings.put({ key, value })
}
