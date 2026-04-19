'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '@/contexts/auth-context'
import {
  db,
  getAllQuestions,
  getAllCategories,
  getAllRelations,
  getPerspectivesByQuestion,
  calculateCompletion,
  getQuestionsByCategory,
  getCategory,
} from '@/lib/db'
import type {
  Question,
  Category,
  QuestionRelation,
  AnswerPerspective,
  QuestionWithCompletion,
  GraphData,
  GraphNode,
  GraphEdge,
} from '@/types/notebook'

// 获取所有问题（带完成度）
export function useQuestions() {
  const { isSupabaseConfigured } = useAuth()

  if (isSupabaseConfigured) {
    // 使用Supabase hooks
    const { useQuestions: useSupabaseQuestions } = require('@/hooks/use-supabase')
    return useSupabaseQuestions()
  }

  // 使用IndexedDB
  return useLiveQuery(async () => {
    const questions = await getAllQuestions()
    const categories = await getAllCategories()
    const categoryMap = new Map(categories.map(c => [c.id, c]))

    const questionsWithCompletion: QuestionWithCompletion[] = await Promise.all(
      questions.map(async (q) => {
        const perspectives = await getPerspectivesByQuestion(q.id)
        const completion = await calculateCompletion(q.id)
        const filledCount = perspectives.filter(p =>
          p.content.trim() !== '' || p.images.length > 0
        ).length

        return {
          ...q,
          completion,
          perspectiveCount: perspectives.length,
          filledPerspectiveCount: filledCount,
          category: q.categoryId ? categoryMap.get(q.categoryId) || null : null,
        }
      })
    )

    return questionsWithCompletion
  }, [])
}

// 获取指定分类的问题
export function useQuestionsByCategory(categoryId: string | null) {
  const { isSupabaseConfigured } = useAuth()

  if (isSupabaseConfigured) {
    // 使用Supabase hooks
    const { useQuestionsByCategory: useSupabaseQuestionsByCategory } = require('@/hooks/use-supabase')
    return useSupabaseQuestionsByCategory(categoryId)
  }

  // 使用IndexedDB
  return useLiveQuery(async () => {
    const questions = categoryId === 'all'
      ? await getAllQuestions()
      : await getQuestionsByCategory(categoryId === 'uncategorized' ? null : categoryId)

    const categories = await getAllCategories()
    const categoryMap = new Map(categories.map(c => [c.id, c]))

    const questionsWithCompletion: QuestionWithCompletion[] = await Promise.all(
      questions.map(async (q) => {
        const perspectives = await getPerspectivesByQuestion(q.id)
        const completion = await calculateCompletion(q.id)
        const filledCount = perspectives.filter(p =>
          p.content.trim() !== '' || p.images.length > 0
        ).length

        return {
          ...q,
          completion,
          perspectiveCount: perspectives.length,
          filledPerspectiveCount: filledCount,
          category: q.categoryId ? categoryMap.get(q.categoryId) || null : null,
        }
      })
    )

    return questionsWithCompletion
  }, [categoryId])
}

// 获取单个问题详情
export function useQuestion(id: string | null) {
  const { isSupabaseConfigured } = useAuth()

  if (isSupabaseConfigured) {
    // 使用Supabase hooks
    const { useQuestion: useSupabaseQuestion } = require('@/hooks/use-supabase')
    return useSupabaseQuestion(id)
  }

  // 使用IndexedDB
  return useLiveQuery(async () => {
    if (!id) return null

    const question = await db.questions.get(id)
    if (!question) return null

    const perspectives = await getPerspectivesByQuestion(id)
    const completion = await calculateCompletion(id)
    const category = question.categoryId ? await getCategory(question.categoryId) : null
    const filledCount = perspectives.filter(p =>
      p.content.trim() !== '' || p.images.length > 0
    ).length

    return {
      ...question,
      completion,
      perspectiveCount: perspectives.length,
      filledPerspectiveCount: filledCount,
      category,
    } as QuestionWithCompletion
  }, [id])
}

// 获取问题的答案角度
export function usePerspectives(questionId: string | null) {
  const { isSupabaseConfigured } = useAuth()

  if (isSupabaseConfigured) {
    // 使用Supabase hooks
    const { usePerspectives: useSupabasePerspectives } = require('@/hooks/use-supabase')
    return useSupabasePerspectives(questionId)
  }

  // 使用IndexedDB
  return useLiveQuery(async () => {
    if (!questionId) return []
    return getPerspectivesByQuestion(questionId)
  }, [questionId])
}

// 获取所有分类
export function useCategories() {
  const { isSupabaseConfigured } = useAuth()

  if (isSupabaseConfigured) {
    // 使用Supabase hooks
    const { useCategories: useSupabaseCategories } = require('@/hooks/use-supabase')
    const result = useSupabaseCategories()
    return { 
      data: result.data, 
      loading: result.loading, 
      refresh: result.refresh 
    }
  }

  // 使用IndexedDB
  const data = useLiveQuery(async () => {
    return getAllCategories()
  }, [])
  return { data: data || [], loading: false, refresh: () => {} }
}

// 获取问题的关系
export function useRelations(questionId: string | null) {
  const { isSupabaseConfigured } = useAuth()

  if (isSupabaseConfigured) {
    // 使用Supabase hooks
    const { useRelations: useSupabaseRelations } = require('@/hooks/use-supabase')
    return useSupabaseRelations(questionId)
  }

  // 使用IndexedDB
  return useLiveQuery(async () => {
    if (!questionId) return []

    const allRelations = await getAllRelations()
    return allRelations.filter(r =>
      r.sourceId === questionId || r.targetId === questionId
    )
  }, [questionId])
}

// 获取所有关系
export function useAllRelations() {
  const { isSupabaseConfigured } = useAuth()

  if (isSupabaseConfigured) {
    // 使用Supabase hooks
    const { useAllRelations: useSupabaseAllRelations } = require('@/hooks/use-supabase')
    return useSupabaseAllRelations()
  }

  // 使用IndexedDB
  return useLiveQuery(async () => {
    return getAllRelations()
  }, [])
}

// 获取统计数据
export function useStats() {
  const { isSupabaseConfigured } = useAuth()

  if (isSupabaseConfigured) {
    // 使用Supabase hooks
    const { useStats: useSupabaseStats } = require('@/hooks/use-supabase')
    return useSupabaseStats()
  }

  // 使用IndexedDB
  return useLiveQuery(async () => {
    const questions = await getAllQuestions()
    const categories = await getAllCategories()
    const relations = await getAllRelations()

    let completedCount = 0
    let totalCompletion = 0

    for (const q of questions) {
      const completion = await calculateCompletion(q.id)
      totalCompletion += completion
      if (completion >= 0.5) completedCount++
    }

    const uncategorizedCount = questions.filter(q => !q.categoryId).length

    return {
      totalQuestions: questions.length,
      completedQuestions: completedCount, // 完成度 >= 50%
      averageCompletion: questions.length > 0 ? totalCompletion / questions.length : 0,
      totalCategories: categories.length,
      totalRelations: relations.length,
      uncategorizedQuestions: uncategorizedCount,
    }
  }, [])
}

// 获取知识图谱数据
export function useGraphData() {
  const { isSupabaseConfigured } = useAuth()

  if (isSupabaseConfigured) {
    // 使用Supabase hooks
    const { useGraphData: useSupabaseGraphData } = require('@/hooks/use-supabase')
    return useSupabaseGraphData()
  }

  // 使用IndexedDB
  return useLiveQuery(async () => {
    const questions = await getAllQuestions()
    const categories = await getAllCategories()
    const relations = await getAllRelations()
    const layouts = await db.layouts.toArray()

    const categoryMap = new Map(categories.map(c => [c.id, c]))
    const layoutMap = new Map(layouts.map(l => [l.questionId, l]))

    // 筛选完成度 >= 50% 的问题
    const qualifiedQuestions: Question[] = []
    const questionCompletions = new Map<string, number>()

    for (const q of questions) {
      const completion = await calculateCompletion(q.id)
      questionCompletions.set(q.id, completion)
      if (completion >= 0.5) {
        qualifiedQuestions.push(q)
      }
    }

    const qualifiedIds = new Set(qualifiedQuestions.map(q => q.id))

    // 构建节点
    const nodes: GraphNode[] = qualifiedQuestions.map(q => {
      const category = q.categoryId ? categoryMap.get(q.categoryId) : null
      const layout = layoutMap.get(q.id)

      return {
        id: q.id,
        text: q.text,
        categoryId: q.categoryId,
        categoryName: category?.name,
        categoryColor: category?.color,
        completion: questionCompletions.get(q.id) || 0,
        x: layout?.x,
        y: layout?.y,
      }
    })

    // 构建边（只包含两端都是合格问题的关系）
    const edges: GraphEdge[] = relations
      .filter(r => qualifiedIds.has(r.sourceId) && qualifiedIds.has(r.targetId))
      .map(r => ({
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        type: r.type,
        note: r.note,
      }))

    return {
      nodes,
      edges,
      canGenerate: qualifiedQuestions.length >= 2,
      qualifiedCount: qualifiedQuestions.length,
      totalCount: questions.length,
    }
  }, [])
}

// 检查是否可以生成图谱
export function useCanGenerateGraph() {
  return useLiveQuery(async () => {
    const questions = await getAllQuestions()
    let qualifiedCount = 0

    for (const q of questions) {
      const completion = await calculateCompletion(q.id)
      if (completion >= 0.5) qualifiedCount++
    }

    return {
      canGenerate: qualifiedCount >= 2,
      qualifiedCount,
      message: qualifiedCount < 2
        ? `至少需要2个完成一半以上的问题才能生成图谱（当前：${qualifiedCount}个）`
        : null,
    }
  }, [])
}
