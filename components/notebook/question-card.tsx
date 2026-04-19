'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { QuestionWithCompletion } from '@/types/notebook'
import { MessageSquare, Layers } from 'lucide-react'

interface QuestionCardProps {
  question: QuestionWithCompletion
  isSelected?: boolean
  onClick?: () => void
}

export function QuestionCard({ question, isSelected, onClick }: QuestionCardProps) {
  const completionPercent = Math.round(question.completion * 100)
  
  // 截断问题文本
  const truncatedText = question.text.length > 60 
    ? question.text.slice(0, 60) + '...' 
    : question.text
  
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        'border-border/60 hover:border-primary/40',
        isSelected && 'ring-2 ring-primary border-primary/60 shadow-md'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* 问题文本 */}
          <h3 className="font-medium text-foreground leading-snug line-clamp-2">
            {truncatedText}
          </h3>
          
          {/* 元信息行 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 分类标签 */}
            {question.category && (
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{ 
                  backgroundColor: `${question.category.color}20`,
                  color: question.category.color,
                  borderColor: question.category.color,
                }}
              >
                {question.category.name}
              </Badge>
            )}
            
            {/* 角度数量 */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Layers className="h-3 w-3" />
              <span>{question.perspectiveCount} 个角度</span>
            </div>
            
            {/* 已填写角度 */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{question.filledPerspectiveCount} 已填写</span>
            </div>
          </div>
          
          {/* 完成度进度条 */}
          <div className="flex items-center gap-2">
            <Progress 
              value={completionPercent} 
              className="h-1.5 flex-1"
            />
            <span className={cn(
              'text-xs font-medium min-w-[36px] text-right',
              completionPercent >= 50 ? 'text-primary' : 'text-muted-foreground'
            )}>
              {completionPercent}%
            </span>
          </div>
          
          {/* 时间 */}
          <p className="text-xs text-muted-foreground">
            {formatRelativeTime(question.updatedAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  
  return new Date(date).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}
