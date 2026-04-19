'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  generateExtensionSuggestions,
  suggestionToQuestion,
  type WikipediaSuggestion
} from '@/lib/api/wikipedia'
import { createQuestion, createRelation, checkDuplicateQuestion, createCategory } from '@/lib/db'
import { useRelations, useQuestions } from '@/hooks/use-notebook'
import { cn } from '@/lib/utils'
import { generateSmartTag } from '@/lib/utils/category-classifier'
import {
  ChevronDown,
  Lightbulb,
  Plus,
  ExternalLink,
  Loader2,
  Link2,
  RefreshCw,
} from 'lucide-react'

interface ExtensionPanelProps {
  questionId: string
  questionText: string
  onQuestionCreated?: (questionId: string) => void
}

export function ExtensionPanel({ 
  questionId, 
  questionText,
  onQuestionCreated 
}: ExtensionPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [suggestions, setSuggestions] = useState<WikipediaSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addedQuestions, setAddedQuestions] = useState<Set<string>>(new Set())
  
  const relations = useRelations(questionId)
  const allQuestions = useQuestions()
  
  // 获取已关联的问题
  const relatedQuestionIds = new Set(
    relations?.flatMap(r => [r.sourceId, r.targetId]).filter(id => id !== questionId)
  )
  
  // 加载推荐
  const loadSuggestions = async () => {
    setIsLoading(true)
    try {
      const results = await generateExtensionSuggestions(questionText)
      setSuggestions(results)
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 首次加载
  useEffect(() => {
    if (questionText && questionText.length > 3) {
      loadSuggestions()
    }
  }, [questionId])
  
  // 添加推荐问题
  const handleAddSuggestion = async (suggestion: WikipediaSuggestion) => {
    const newQuestionText = suggestionToQuestion(suggestion)

    // 检查是否已存在
    const duplicate = await checkDuplicateQuestion(newQuestionText)
    if (duplicate) {
      // 如果存在，只创建关联
      await createRelation(questionId, duplicate.id, 'extension')
      setAddedQuestions(prev => new Set([...prev, suggestion.title]))
      return
    }

    // 自动识别分类
    let categoryId: string | null = null
    const autoCategory = generateSmartTag(newQuestionText)
    if (autoCategory) {
      const category = await createCategory(autoCategory)
      categoryId = category.id
    }

    // 创建新问题
    const newQuestion = await createQuestion(newQuestionText, categoryId)

    // 创建关联
    await createRelation(questionId, newQuestion.id, 'extension')

    setAddedQuestions(prev => new Set([...prev, suggestion.title]))
    onQuestionCreated?.(newQuestion.id)
  }
  
  // 添加自定义问题
  const handleAddCustomQuestion = async () => {
    if (!customQuestion.trim()) return

    setIsAdding(true)
    try {
      // 检查是否已存在
      const duplicate = await checkDuplicateQuestion(customQuestion)
      if (duplicate) {
        // 如果存在，只创建关联
        await createRelation(questionId, duplicate.id, 'extension')
      } else {
        // 自动识别分类
        let categoryId: string | null = null
        const autoCategory = generateSmartTag(customQuestion)
        if (autoCategory) {
          const category = await createCategory(autoCategory)
          categoryId = category.id
        }

        // 创建新问题
        const newQuestion = await createQuestion(customQuestion.trim(), categoryId)
        await createRelation(questionId, newQuestion.id, 'extension')
        onQuestionCreated?.(newQuestion.id)
      }

      setCustomQuestion('')
    } catch (error) {
      console.error('Failed to add question:', error)
    } finally {
      setIsAdding(false)
    }
  }
  
  // 关联已有问题
  const handleLinkExisting = async (existingQuestionId: string) => {
    await createRelation(questionId, existingQuestionId, 'relevant')
  }
  
  // 筛选可关联的已有问题（排除自己和已关联的）
  const linkableQuestions = allQuestions?.filter(q => 
    q.id !== questionId && !relatedQuestionIds.has(q.id)
  ).slice(0, 5)
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-0 hover:bg-transparent"
          >
            <div className="flex items-center gap-2 px-4 py-3">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="font-medium">延伸问题</span>
              {relations && relations.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {relations.length} 个关联
                </Badge>
              )}
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform mr-4',
              isOpen && 'rotate-180'
            )} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 p-4 overflow-hidden">
        {/* 自动推荐区域 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              基于维基百科的相关推荐
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={loadSuggestions}
              disabled={isLoading}
            >
              <RefreshCw className={cn(
                'h-3 w-3',
                isLoading && 'animate-spin'
              )} />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <SuggestionCard
                  key={index}
                  suggestion={suggestion}
                  isAdded={addedQuestions.has(suggestion.title)}
                  onAdd={() => handleAddSuggestion(suggestion)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              暂无推荐，请尝试刷新或手动添加
            </p>
          )}
        </div>
        
        {/* 手动添加 */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">手动添加延伸问题</p>
          <div className="flex gap-2">
            <Input
              placeholder="输入你想延伸的问题..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCustomQuestion()
              }}
            />
            <Button 
              size="icon"
              onClick={handleAddCustomQuestion}
              disabled={!customQuestion.trim() || isAdding}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* 关联已有问题 */}
        {linkableQuestions && linkableQuestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">关联已有问题</p>
            <ScrollArea className="max-h-[120px]">
              <div className="space-y-1">
                {linkableQuestions.map(q => (
                  <div 
                    key={q.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                  >
                    <span className="text-sm truncate flex-1 mr-2">
                      {q.text.slice(0, 40)}...
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleLinkExisting(q.id)}
                    >
                      <Link2 className="h-3 w-3 mr-1" />
                      关联
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
    </div>
  )
}

// 推荐卡片
interface SuggestionCardProps {
  suggestion: WikipediaSuggestion
  isAdded: boolean
  onAdd: () => void
}

function SuggestionCard({ suggestion, isAdded, onAdd }: SuggestionCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  
  const handleAdd = async () => {
    setIsAdding(true)
    await onAdd()
    setIsAdding(false)
  }
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{suggestion.title}</p>
            {suggestion.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {suggestion.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {suggestion.url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                asChild
              >
                <a href={suggestion.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
            <Button
              variant={isAdded ? 'secondary' : 'default'}
              size="sm"
              className="h-7"
              onClick={handleAdd}
              disabled={isAdded || isAdding}
            >
              {isAdding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isAdded ? (
                '已添加'
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  添加
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
