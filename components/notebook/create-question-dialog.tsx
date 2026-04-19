'use client'

import { useState } from 'react'
import { generateSmartTag } from '@/lib/utils/category-classifier'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createQuestion, checkDuplicateQuestion, createCategory } from '@/lib/data-access'
import { AlertCircle } from 'lucide-react'
import { clearCache } from '@/hooks/use-supabase'

interface CreateQuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (questionId: string) => void
  defaultCategoryId?: string | null
}

export function CreateQuestionDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateQuestionDialogProps) {
  const [questionText, setQuestionText] = useState('')
  const [answerText, setAnswerText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('uncategorized')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const handleQuestionChange = async (value: string) => {
    setQuestionText(value)
    setError(null)
    setDuplicateWarning(null)

    console.log('=== 自动标签生成调试 ===')
    console.log('输入值:', value)
    console.log('输入长度:', value.length)

    // 实时生成标签
    if (value.trim().length > 2) {
      console.log('开始生成标签...')
      const autoTag = generateSmartTag(value)
      console.log('生成的标签:', autoTag)
      if (autoTag) {
        console.log('设置分类为:', autoTag)
        setSelectedCategory(autoTag)
      } else {
        console.log('未匹配到分类，设置为uncategorized')
        setSelectedCategory('uncategorized')
      }
    } else {
      console.log('输入太短，设置为uncategorized')
      setSelectedCategory('uncategorized')
    }

    // 检查重复
    if (value.trim().length > 5) {
      const duplicate = await checkDuplicateQuestion(value)
      if (duplicate) {
        setDuplicateWarning(`已存在类似问题：「${duplicate.text.slice(0, 30)}...」`)
      }
    }
  }
  
  const handleSubmit = async () => {
    if (!questionText.trim()) {
      setError('请输入问题内容')
      return
    }
    
    if (questionText.trim().length < 2) {
      setError('问题至少需要2个字符')
      return
    }
    
    // 最终检查重复
    const duplicate = await checkDuplicateQuestion(questionText)
    if (duplicate) {
      setError('该问题已存在，请查看或修改已有问题')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // 处理分类
      let categoryId: string | null = null

      if (selectedCategory && selectedCategory !== 'uncategorized') {
        const category = await createCategory(selectedCategory)
        categoryId = category.id
      } else if (!selectedCategory) {
        // 自动生成标签
        const autoTag = generateSmartTag(questionText)
        if (autoTag) {
          const category = await createCategory(autoTag)
          categoryId = category.id
        }
      }

      const question = await createQuestion(
        questionText.trim(),
        categoryId,
        answerText.trim() || undefined
      )
      
      // 清除缓存，强制重新加载数据
      clearCache()
      
      // 重置表单
      setQuestionText('')
      setAnswerText('')
      setSelectedCategory('')
      onOpenChange(false)
      onCreated?.(question.id)
    } catch (err) {
      setError('创建失败，请重试')
      console.error('Create question error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setQuestionText('')
      setAnswerText('')
      setSelectedCategory('')
      setError(null)
      setDuplicateWarning(null)
    }
    onOpenChange(open)
  }
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新建问题</DialogTitle>
          <DialogDescription>
            记录一个你想要探索的问题，系统会帮你整理和扩展
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          {/* 问题输入 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="question-text">问题</Label>
            <Textarea
              id="question-text"
              placeholder="输入你的问题，例如：什么是光合作用？"
              value={questionText}
              onChange={(e) => handleQuestionChange(e.target.value)}
              className="min-h-[80px] resize-none"
              autoFocus
            />
            {duplicateWarning && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {duplicateWarning}
              </p>
            )}
          </div>
          
          {/* 答案输入 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="answer-text">答案（可选）</Label>
            <Textarea
              id="answer-text"
              placeholder="如果你已经有答案，可以在这里输入..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
          
          {/* 分类选择 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-select">
              知识分类
              <span className="text-muted-foreground font-normal ml-1">
                （系统会自动识别，也可手动修改）
              </span>
            </Label>
            {selectedCategory && selectedCategory !== 'uncategorized' && (
              <p className="text-sm text-green-600 dark:text-green-400">
                自动识别为：{selectedCategory}
              </p>
            )}
            <Select value={selectedCategory || 'uncategorized'} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category-select">
                <SelectValue placeholder="选择知识分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uncategorized">未分类</SelectItem>
                <SelectItem value="自然科学">自然科学</SelectItem>
                <SelectItem value="工程技术">工程技术</SelectItem>
                <SelectItem value="医学健康">医学健康</SelectItem>
                <SelectItem value="人文社科">人文社科</SelectItem>
                <SelectItem value="社会科学">社会科学</SelectItem>
                <SelectItem value="其他">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
            创建问题
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
