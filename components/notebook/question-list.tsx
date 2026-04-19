'use client'

import { QuestionCard } from './question-card'
import { Empty } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import type { QuestionWithCompletion } from '@/types/notebook'
import { FileQuestion } from 'lucide-react'

interface QuestionListProps {
  questions: QuestionWithCompletion[] | undefined
  selectedId: string | null
  onSelect: (id: string) => void
  isLoading?: boolean
}

export function QuestionList({ 
  questions, 
  selectedId, 
  onSelect,
  isLoading 
}: QuestionListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <QuestionCardSkeleton key={i} />
        ))}
      </div>
    )
  }
  
  if (!questions || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] w-full">
        <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground/50">
          <FileQuestion className="h-24 w-24" />
          <p className="text-lg font-medium text-center">开始学习之旅</p>
          <p className="text-sm text-center">点击右上角的「新建问题」开始记录你的第一个问题</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          isSelected={selectedId === question.id}
          onClick={() => onSelect(question.id)}
        />
      ))}
    </div>
  )
}

function QuestionCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-1.5 w-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}
