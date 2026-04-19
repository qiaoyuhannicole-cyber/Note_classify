// 问径核心类型定义

// 关系类型
export type RelationType = 
  | 'extension'    // 延伸
  | 'contrast'     // 对比
  | 'relevant'     // 相关
  | 'cause-effect' // 因果
  | 'depends-on'   // 依赖

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  'extension': '延伸',
  'contrast': '对比',
  'relevant': '相关',
  'cause-effect': '因果',
  'depends-on': '依赖',
}

export const RELATION_TYPE_COLORS: Record<RelationType, string> = {
  'extension': '#3b82f6',    // blue
  'contrast': '#f59e0b',     // amber
  'relevant': '#10b981',     // emerald
  'cause-effect': '#ef4444', // red
  'depends-on': '#8b5cf6',   // violet
}

// 问题
export interface Question {
  id: string
  userId: string
  text: string
  categoryId: string | null
  createdAt: Date
  updatedAt: Date
  embedding?: number[]
}

// 答案角度
export interface AnswerPerspective {
  id: string
  questionId: string
  label: string
  content: string // HTML富文本
  images: string[] // Base64图片
  order: number
  isMain: boolean // 是否为主答案
  createdAt: Date
  updatedAt: Date
}

// 分类
export interface Category {
  id: string
  userId: string
  name: string
  description?: string
  color?: string
  representativeEmbedding?: number[]
  questionCount: number
  createdAt: Date
  updatedAt: Date
}

// 问题关系
export interface QuestionRelation {
  id: string
  sourceId: string
  targetId: string
  type: RelationType
  note?: string
  createdAt: Date
}

// 图谱布局缓存
export interface GraphLayout {
  questionId: string
  x: number
  y: number
}

// 系统设置
export interface Settings {
  key: string
  value: unknown
}

// ============ 视图类型 ============

// 带完成度的问题视图
export interface QuestionWithCompletion extends Question {
  completion: number
  perspectiveCount: number
  filledPerspectiveCount: number
  category?: Category | null
}

// 图谱节点
export interface GraphNode {
  id: string
  text: string
  categoryId: string | null
  categoryName?: string
  categoryColor?: string
  completion: number
  x?: number
  y?: number
}

// 图谱边
export interface GraphEdge {
  id: string
  source: string
  target: string
  type: RelationType
  note?: string
}

// 图谱数据
export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  canGenerate?: boolean
  qualifiedCount?: number
  totalCount?: number
}

// Wikipedia 推荐结果
export interface WikipediaSuggestion {
  title: string
  description?: string
  url?: string
}

// 导出数据格式
export interface NotebookExport {
  version: string
  exportedAt: Date
  questions: Question[]
  perspectives: AnswerPerspective[]
  categories: Category[]
  relations: QuestionRelation[]
  layouts: GraphLayout[]
}
