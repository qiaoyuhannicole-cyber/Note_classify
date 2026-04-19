'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import {
  getAllQuestions,
  getAllCategories,
  getAllRelations,
  getPerspectivesByQuestion,
  calculateCompletion,
  getQuestionsByCategory,
  getCategory,
  getQuestion,
} from '@/lib/supabase/db'
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

// 简单缓存
const cache = {
  questions: null as QuestionWithCompletion[] | null,
  categories: null as Category[] | null,
  timestamp: 0,
}

// 清除缓存
export function clearCache() {
  cache.questions = null
  cache.categories = null
  cache.timestamp = 0
}

// 获取所有问题（带完成度）
export function useQuestions() {
  const { user } = useAuth()
  const [data, setData] = useState<QuestionWithCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    if (!user) return

    const fetchData = async () => {
      // 使用短缓存（30秒）
      const now = Date.now()
      if (cache.questions && cache.timestamp > now - 30 * 1000) {
        if (mounted.current) {
          setData(cache.questions!)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      try {
        const questions = await getAllQuestions()

        const categories = await getAllCategories()
        const categoryMap = new Map(categories.map(c => [c.id, c]))

        // 批量查询 perspectives
        const { data: allPerspectives } = await supabase!
          .from('perspectives')
          .select('*')
          .in('question_id', questions.map(q => q.id))

        const perspectiveMap = new Map()
        if (allPerspectives) {
          allPerspectives.forEach((p: any) => {
            if (!perspectiveMap.has(p.question_id)) {
              perspectiveMap.set(p.question_id, [])
            }
            perspectiveMap.get(p.question_id).push(p)
          })
        }

        const questionsWithCompletion: QuestionWithCompletion[] = questions.map(q => {
          const perspectives = perspectiveMap.get(q.id) || []
          const completion = perspectives.length > 0
            ? perspectives.filter((p: any) => p.content.trim() !== '' || p.images.length > 0).length / perspectives.length
            : 0
          const filledCount = perspectives.filter((p: any) =>
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

        // 更新缓存
        cache.questions = questionsWithCompletion
        cache.timestamp = now

        if (mounted.current) {
          setData(questionsWithCompletion)
        }
      } catch (error) {
        console.error('Error fetching questions:', error)
      } finally {
        if (mounted.current) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      mounted.current = false
    }
  }, [user])

  return { data, loading }
}

// 获取指定分类的问题
export function useQuestionsByCategory(categoryId: string | null) {
  const { user } = useAuth()
  const [data, setData] = useState<QuestionWithCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    if (!user) return

    const fetchData = async () => {
      // 使用缓存（5分钟内有效）
      const now = Date.now()
      if (cache.questions && cache.timestamp > now - 5 * 60 * 1000) {
        if (mounted.current) {
          const filtered = categoryId === 'all' 
            ? cache.questions!
            : cache.questions!.filter(q => 
                categoryId === 'uncategorized' 
                  ? !q.categoryId 
                  : q.categoryId === categoryId
              )
          setData(filtered)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      try {
        const questions = categoryId === 'all'
          ? await getAllQuestions()
          : await getQuestionsByCategory(categoryId === 'uncategorized' ? null : categoryId)

        const categories = await getAllCategories()
        const categoryMap = new Map(categories.map(c => [c.id, c]))

        // 批量查询所有 perspectives
        const { data: allPerspectives } = await supabase!
          .from('perspectives')
          .select('*')
          .in('question_id', questions.map(q => q.id))

        const perspectiveMap = new Map()
        if (allPerspectives) {
          allPerspectives.forEach(p => {
            if (!perspectiveMap.has(p.question_id)) {
              perspectiveMap.set(p.question_id, [])
            }
            perspectiveMap.get(p.question_id).push(p)
          })
        }

        const questionsWithCompletion: QuestionWithCompletion[] = questions.map(q => {
          const perspectives = perspectiveMap.get(q.id) || []
          const completion = perspectives.length > 0
            ? perspectives.filter(p => p.content.trim() !== '' || p.images.length > 0).length / perspectives.length
            : 0
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

        // 更新缓存
        cache.questions = questionsWithCompletion
        cache.timestamp = now

        if (mounted.current) {
          setData(questionsWithCompletion)
        }
      } catch (error) {
        console.error('Error fetching questions by category:', error)
      } finally {
        if (mounted.current) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      mounted.current = false
    }
  }, [categoryId, user])

  return { data, loading }
}

// 获取单个问题详情
export function useQuestion(id: string | null) {
  const [data, setData] = useState<QuestionWithCompletion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setData(null)
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        const question = await getQuestion(id)
        if (!question) {
          setData(null)
          setLoading(false)
          return
        }

        const perspectives = await getPerspectivesByQuestion(id)
        const completion = await calculateCompletion(id)
        const category = question.categoryId ? await getCategory(question.categoryId) : null
        const filledCount = perspectives.filter(p =>
          p.content.trim() !== '' || p.images.length > 0
        ).length

        setData({
          ...question,
          completion,
          perspectiveCount: perspectives.length,
          filledPerspectiveCount: filledCount,
          category,
        } as QuestionWithCompletion)
      } catch (error) {
        console.error('Error fetching question:', error)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  return data
}

// 获取问题的答案角度
export function usePerspectives(questionId: string | null) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!questionId) {
      setData([])
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        const perspectives = await getPerspectivesByQuestion(questionId)
        setData(perspectives)
      } catch (error) {
        console.error('Error fetching perspectives:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [questionId])

  return data
}

// 获取所有分类
export function useCategories() {
  const { user } = useAuth()
  const [data, setData] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const mounted = useRef(true)

  const refresh = () => {
    cache.categories = null // 清除缓存
    setRefreshKey(prev => prev + 1)
  }

  useEffect(() => {
    mounted.current = true
    if (!user) return

    const fetchData = async () => {
      // 使用缓存（5分钟内有效）
      const now = Date.now()
      if (cache.categories && cache.timestamp > now - 5 * 60 * 1000 && refreshKey === 0) {
        if (mounted.current) {
          setData(cache.categories!)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      try {
        const categories = await getAllCategories()
        
        // 更新缓存
        cache.categories = categories
        cache.timestamp = now

        if (mounted.current) {
          setData(categories)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      } finally {
        if (mounted.current) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      mounted.current = false
    }
  }, [user, refreshKey])

  return { data, loading, refresh }
}

// 获取问题的关系
export function useRelations(questionId: string | null) {
  const [data, setData] = useState<QuestionRelation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!questionId) {
      setData([])
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        const allRelations = await getAllRelations()
        setData(allRelations.filter(r =>
          r.sourceId === questionId || r.targetId === questionId
        ))
      } catch (error) {
        console.error('Error fetching relations:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [questionId])

  return data
}

// 获取所有关系
export function useAllRelations() {
  const [data, setData] = useState<QuestionRelation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const relations = await getAllRelations()
        setData(relations)
      } catch (error) {
        console.error('Error fetching all relations:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return data
}

// 获取统计数据
export function useStats() {
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      try {
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

        setData({
          totalQuestions: questions.length,
          completedQuestions: completedCount,
          averageCompletion: questions.length > 0 ? totalCompletion / questions.length : 0,
          totalCategories: categories.length,
          totalRelations: relations.length,
          uncategorizedQuestions: uncategorizedCount,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  return data
}

// 获取知识图谱数据
export function useGraphData() {
  const { user } = useAuth()
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const questions = await getAllQuestions()
        const categories = await getAllCategories()
        const relations = await getAllRelations()

        const categoryMap = new Map(categories.map(c => [c.id, c]))

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

          return {
            id: q.id,
            text: q.text,
            categoryId: q.categoryId,
            categoryName: category?.name,
            categoryColor: category?.color,
            completion: questionCompletions.get(q.id) || 0,
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

        setData({
          nodes,
          edges,
          canGenerate: qualifiedQuestions.length >= 2,
          qualifiedCount: qualifiedQuestions.length,
          totalCount: questions.length,
        })
      } catch (error) {
        console.error('Error fetching graph data:', error)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  return data
}
