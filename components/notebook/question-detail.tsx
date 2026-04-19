'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { useQuestion, usePerspectives, useCategories } from '@/hooks/use-notebook'
import { 
  updateQuestion, 
  deleteQuestion, 
  createPerspective, 
  updatePerspective,
  deletePerspective 
} from '@/lib/db'
import { cn } from '@/lib/utils'
import { RichTextEditor } from '@/components/shared/rich-text-editor'
import { ExtensionPanel } from './extension-panel'
import { 
  X, 
  Trash2, 
  Plus, 
  Save,
  Pencil,
  Check,
} from 'lucide-react'

interface QuestionDetailProps {
  questionId: string | null
  onClose: () => void
  onDeleted?: () => void
}

export function QuestionDetail({ questionId, onClose, onDeleted }: QuestionDetailProps) {
  const question = useQuestion(questionId)
  const perspectives = usePerspectives(questionId)
  const categories = useCategories()
  
  const [isEditingText, setIsEditingText] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [activeTab, setActiveTab] = useState<string>('')
  
  // 当问题加载时，设置默认活动标签
  useEffect(() => {
    if (perspectives && perspectives.length > 0) {
      // 只有当activeTab不在当前perspectives中时才更新
      const currentTabExists = perspectives.some(p => p.id === activeTab)
      if (!currentTabExists) {
        setActiveTab(perspectives[0].id)
      }
    } else {
      setActiveTab('')
    }
  }, [perspectives, questionId])

  // 当问题改变时重置状态
  useEffect(() => {
    setActiveTab('')
    setIsEditingText(false)
    setEditedText('')
  }, [questionId])
  
  if (!questionId || !question) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>选择一个问题查看详情</p>
      </div>
    )
  }
  
  const completionPercent = Math.round(question.completion * 100)
  
  const handleSaveText = async () => {
    if (editedText.trim() && editedText !== question.text) {
      await updateQuestion(questionId, { text: editedText.trim() })
    }
    setIsEditingText(false)
  }

  const handleCategoryChange = async (value: string) => {
    await updateQuestion(questionId, { 
      categoryId: value === 'none' ? null : value 
    })
  }
  
  const handleDelete = async () => {
    await deleteQuestion(questionId)
    onDeleted?.()
    onClose()
  }
  
  const handleAddPerspective = async () => {
    const newPerspective = await createPerspective(
      questionId,
      `角度 ${(perspectives?.length || 0) + 1}`,
      false
    )
    setActiveTab(newPerspective.id)
  }
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-lg">问题详情</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          {/* 问题文本 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                问题
              </label>
              {!isEditingText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditedText(question.text)
                    setIsEditingText(true)
                  }}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  编辑
                </Button>
              )}
            </div>

            {isEditingText ? (
              <div className="space-y-2">
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[80px]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveText}>
                    <Check className="h-3 w-3 mr-1" />
                    保存
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingText(false)}
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-foreground leading-relaxed">
                {question.text}
              </p>
            )}
          </div>


          <Separator />
          
          {/* 分类选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              分类
            </label>
            <Select 
              value={question.categoryId || 'none'} 
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未分类</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* 完成度 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                完成度
              </label>
              <span className={cn(
                'text-sm font-medium',
                completionPercent >= 50 ? 'text-primary' : 'text-muted-foreground'
              )}>
                {completionPercent}%
              </span>
            </div>
            <Progress value={completionPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {question.filledPerspectiveCount} / {question.perspectiveCount} 个角度已填写
              {completionPercent >= 50 && (
                <Badge variant="secondary" className="ml-2">
                  可参与图谱
                </Badge>
              )}
            </p>
          </div>
          
          <Separator />

          {/* 延伸问题 */}
          <div className="space-y-2 overflow-hidden">
            <ExtensionPanel
              questionId={questionId}
              questionText={question.text}
            />
          </div>

          <Separator className="my-4" />

          {/* 答案角度 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                答案角度
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPerspective}
              >
                <Plus className="h-3 w-3 mr-1" />
                添加角度
              </Button>
            </div>
            
            {perspectives && perspectives.length > 0 && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                  {perspectives.map((p) => (
                    <TabsTrigger 
                      key={p.id} 
                      value={p.id}
                      className="text-xs"
                    >
                      {p.label}
                      {p.content.trim() && (
                        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {perspectives.map((perspective) => (
                  <TabsContent key={perspective.id} value={perspective.id}>
                    <PerspectiveEditor
                      perspective={perspective}
                      isMain={perspective.isMain}
                      onDelete={() => {
                        deletePerspective(perspective.id)
                        const remaining = perspectives.filter(p => p.id !== perspective.id)
                        if (remaining.length > 0) {
                          setActiveTab(remaining[0].id)
                        }
                      }}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </div>
      </div>
      
      {/* 底部操作栏 */}
      <div className="p-4 border-t">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="w-full">
              <Trash2 className="h-4 w-4 mr-2" />
              删除问题
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确定删除这个问题吗？</AlertDialogTitle>
              <AlertDialogDescription>
                删除后，该问题的所有答案和关联关系都将被永久删除，此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                确定删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

// 角度编辑器组件
interface PerspectiveEditorProps {
  perspective: {
    id: string
    label: string
    content: string
    images: string[]
    isMain: boolean
  }
  isMain: boolean
  onDelete: () => void
}

function PerspectiveEditor({ perspective, isMain, onDelete }: PerspectiveEditorProps) {
  const [label, setLabel] = useState(perspective.label)
  const [content, setContent] = useState(perspective.content)
  const [images, setImages] = useState<string[]>(perspective.images || [])
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 当切换角度时更新状态
  useEffect(() => {
    setLabel(perspective.label)
    setContent(perspective.content)
    setImages(perspective.images || [])
  }, [perspective.id, perspective.label, perspective.content, perspective.images])
  
  const handleSaveLabel = async () => {
    if (label.trim() && label !== perspective.label) {
      await updatePerspective(perspective.id, { label: label.trim() })
    }
    setIsEditingLabel(false)
  }
  
  const handleContentChange = (value: string) => {
    setContent(value)
    
    // 防抖保存
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(async () => {
      await updatePerspective(perspective.id, { content: value })
    }, 500)
  }
  
  const handleImageUpload = async (newImages: string[]) => {
    setImages(newImages)
    await updatePerspective(perspective.id, { images: newImages })
  }
  
  return (
    <div className="space-y-3 pt-3">
      {/* 角度标签编辑 */}
      <div className="flex items-center gap-2">
        {isEditingLabel ? (
          <>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveLabel()
                if (e.key === 'Escape') setIsEditingLabel(false)
              }}
            />
            <Button size="sm" variant="ghost" onClick={handleSaveLabel}>
              <Check className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <>
            <Badge variant="outline" className="cursor-pointer" onClick={() => setIsEditingLabel(true)}>
              {perspective.label}
              <Pencil className="h-2.5 w-2.5 ml-1" />
            </Badge>
            {isMain && (
              <Badge variant="secondary" className="text-xs">
                主答案
              </Badge>
            )}
            {!isMain && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="ml-auto text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
      </div>
      
      {/* 富文本编辑器 */}
      <RichTextEditor
        content={content}
        onChange={handleContentChange}
        images={images}
        onImageUpload={handleImageUpload}
        placeholder="在这里写下你的答案，支持加粗、列表、引用和图片..."
      />
    </div>
  )
}
