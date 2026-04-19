import { supabase } from './client'
import type { Question, AnswerPerspective, Category, QuestionRelation, GraphLayout } from '@/types/notebook'

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const now = new Date()
  const question = {
    id: generateId(),
    user_id: user.id,
    text: text.trim(),
    category_id: categoryId,
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('questions')
    .insert(question)
    .select()
    .single()

  if (error) throw error

  // 自动创建主答案角度
  const perspective = await createPerspective(data.id, '主答案', true)
  if (initialAnswer) {
    await updatePerspective(perspective.id, { content: initialAnswer })
  }

  // 更新分类问题数量
  if (categoryId) {
    await updateCategoryCount(categoryId)
  }

  return data
}

export async function updateQuestion(id: string, updates: Partial<Pick<Question, 'text' | 'categoryId'>>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('questions')
    .update({
      ...updates,
      updated_at: new Date(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function deleteQuestion(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function getQuestion(id: string): Promise<Question | null> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  // 转换 snake_case 到 camelCase
  return {
    ...data,
    userId: data.user_id,
    categoryId: data.category_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } as Question
}

export async function getAllQuestions(): Promise<Question[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) throw error
  // 转换 snake_case 到 camelCase
  return (data || []).map(q => ({
    ...q,
    userId: q.user_id,
    categoryId: q.category_id,
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  })) as Question[]
}

export async function getQuestionsByCategory(categoryId: string | null): Promise<Question[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('questions')
    .select('*')
    .eq('user_id', user.id)

  if (categoryId === null) {
    query = query.is('category_id', null)
  } else {
    query = query.eq('category_id', categoryId)
  }

  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function checkDuplicateQuestion(text: string, excludeId?: string): Promise<Question | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const normalizedText = text.trim().toLowerCase()
    .replace(/[？?！!。.，,、；;：:""''「」『』【】]/g, '')
    .replace(/\s+/g, '')

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('user_id', user.id)

  if (error) return null

  for (const q of data || []) {
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data: existing } = await supabase
    .from('perspectives')
    .select('order')
    .eq('question_id', questionId)
    .order('order', { ascending: false })
    .limit(1)

  const order = existing && existing.length > 0 ? existing[0].order + 1 : 0

  const now = new Date()
  const perspective: any = {
    id: generateId(),
    question_id: questionId,
    label,
    content: '',
    images: [],
    order,
    is_main: isMain,
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('perspectives')
    .insert(perspective)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePerspective(
  id: string,
  updates: Partial<Pick<AnswerPerspective, 'label' | 'content' | 'images' | 'order'>>
): Promise<void> {
  const { error } = await supabase
    .from('perspectives')
    .update({
      ...updates,
      updated_at: new Date(),
    })
    .eq('id', id)

  if (error) throw error
}

export async function deletePerspective(id: string): Promise<void> {
  const { data: perspective } = await supabase
    .from('perspectives')
    .select('*')
    .eq('id', id)
    .single()

  if (!perspective || perspective.isMain) return // 不允许删除主答案

  const { error } = await supabase
    .from('perspectives')
    .delete()
    .eq('id', id)

  if (error) throw error

  // 重新排序剩余角度
  const { data: remaining } = await supabase
    .from('perspectives')
    .select('*')
    .eq('question_id', perspective.questionId)
    .order('order', { ascending: true })

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from('perspectives')
        .update({ order: i })
        .eq('id', remaining[i].id)
    }
  }
}

export async function getPerspectivesByQuestion(questionId: string): Promise<AnswerPerspective[]> {
  const { data, error } = await supabase
    .from('perspectives')
    .select('*')
    .eq('question_id', questionId)
    .order('order', { ascending: true })

  if (error) throw error
  return data || []
}

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const trimmedName = name.trim()
  const { data: existing } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .ilike('name', trimmedName)
    .single()

  if (existing) return existing

  const now = new Date()
  const category: any = {
    id: generateId(),
    user_id: user.id,
    name: trimmedName,
    description,
    color: color || generateCategoryColor(),
    question_count: 0,
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCategory(
  id: string,
  updates: Partial<Pick<Category, 'name' | 'description' | 'color'>>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { error } = await supabase
    .from('categories')
    .update({
      ...updates,
      updated_at: new Date(),
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 将该分类下的问题移动到未分类
  await supabase
    .from('questions')
    .update({ category_id: null } as any)
    .eq('category_id', id)
    .eq('user_id', user.id)

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

async function updateCategoryCount(categoryId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .eq('user_id', user.id)

  await supabase
    .from('categories')
    .update({ question_count: count || 0 })
    .eq('id', categoryId)
}

export async function getCategory(id: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getAllCategories(): Promise<Category[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) throw error
  // 转换 snake_case 到 camelCase
  return (data || []).map(c => ({
    ...c,
    userId: c.user_id,
    questionCount: c.question_count || 0,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  })) as Category[]
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 检查是否已存在相同关系
  const { data: existing } = await supabase
    .from('relations')
    .select('*')
    .or(`source_id.eq.${sourceId},target_id.eq.${sourceId}`)
    .or(`source_id.eq.${targetId},target_id.eq.${targetId}`)

  if (existing && existing.length > 0) return null

  const relation: any = {
    id: generateId(),
    source_id: sourceId,
    target_id: targetId,
    type,
    note,
    created_at: new Date(),
  }

  const { data, error } = await supabase
    .from('relations')
    .insert(relation)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRelation(
  id: string,
  updates: Partial<Pick<QuestionRelation, 'type' | 'note'>>
): Promise<void> {
  const { error } = await supabase
    .from('relations')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

export async function deleteRelation(id: string): Promise<void> {
  const { error } = await supabase
    .from('relations')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getRelationsByQuestion(questionId: string): Promise<QuestionRelation[]> {
  const { data, error } = await supabase
    .from('relations')
    .select('*')
    .or(`source_id.eq.${questionId},target_id.eq.${questionId}`)

  if (error) throw error
  return data || []
}

export async function getAllRelations(): Promise<QuestionRelation[]> {
  const { data, error } = await supabase
    .from('relations')
    .select('*')

  if (error) throw error
  return data || []
}

// ============ 图谱布局操作 ============

export async function saveLayout(questionId: string, x: number, y: number): Promise<void> {
  const { error } = await supabase
    .from('layouts')
    .upsert({ questionId, x, y })

  if (error) throw error
}

export async function getLayout(questionId: string): Promise<GraphLayout | null> {
  const { data, error } = await supabase
    .from('layouts')
    .select('*')
    .eq('question_id', questionId)
    .single()

  if (error) return null
  return data
}

export async function getAllLayouts(): Promise<GraphLayout[]> {
  const { data, error } = await supabase
    .from('layouts')
    .select('*')

  if (error) throw error
  return data || []
}

export async function clearLayouts(): Promise<void> {
  const { error } = await supabase
    .from('layouts')
    .delete()

  if (error) throw error
}
