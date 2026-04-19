'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCategories, useStats } from '@/hooks/use-notebook'
import { createCategory, deleteCategory, updateCategory } from '@/lib/data-access'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import {
  Folder,
  FolderOpen,
  ChevronRight,
  Plus,
  FileQuestion,
  Inbox,
  BarChart3,
  Settings,
  Trash2,
  Pencil,
} from 'lucide-react'

interface NotebookSidebarProps {
  selectedCategory: string
  onSelectCategory: (categoryId: string) => void
}

export function NotebookSidebar({ 
  selectedCategory, 
  onSelectCategory 
}: NotebookSidebarProps) {
  const { data: categories, refresh } = useCategories()
  const stats = useStats()
  const [isOpen, setIsOpen] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null)
  
  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo/标题 */}
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="font-bold text-lg">问径</h1>
        <p className="text-xs text-muted-foreground mt-1">
          以问题驱动的知识管理
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* 全部问题 */}
          <SidebarItem
            icon={FileQuestion}
            label="全部问题"
            count={stats?.totalQuestions}
            isSelected={selectedCategory === 'all'}
            onClick={() => onSelectCategory('all')}
          />
          
          {/* 未分类 */}
          <SidebarItem
            icon={Inbox}
            label="未分类"
            count={stats?.uncategorizedQuestions}
            isSelected={selectedCategory === 'uncategorized'}
            onClick={() => onSelectCategory('uncategorized')}
          />
          
          {/* 分类文件夹 */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                <div className="flex items-center gap-2">
                  <ChevronRight className={cn(
                    'h-4 w-4 transition-transform',
                    isOpen && 'rotate-90'
                  )} />
                  <span>分类</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCreateDialog(true)
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pl-4 space-y-0.5">
              {categories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  isSelected={selectedCategory === category.id}
                  onClick={() => onSelectCategory(category.id)}
                  onEdit={() => setEditingCategory({ id: category.id, name: category.name })}
                  onDelete={() => deleteCategory(category.id)}
                />
              ))}
              
              {(!categories || categories.length === 0) && (
                <p className="text-xs text-muted-foreground px-2 py-4">
                  暂无分类，点击 + 创建
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
      
      {/* 底部统计 */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>
            {stats?.completedQuestions || 0} / {stats?.totalQuestions || 0} 问题可生成图谱
          </span>
        </div>
      </div>
      
      {/* 创建分类对话框 */}
      <CreateCategoryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={refresh}
      />
      
      {/* 编辑分类对话框 */}
      <EditCategoryDialog
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
      />
    </div>
  )
}

// 侧边栏项目
interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count?: number
  isSelected?: boolean
  onClick?: () => void
}

function SidebarItem({ icon: Icon, label, count, isSelected, onClick }: SidebarItemProps) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {count}
        </Badge>
      )}
    </button>
  )
}

// 分类项目
interface CategoryItemProps {
  category: {
    id: string
    name: string
    color?: string
    questionCount: number
  }
  isSelected?: boolean
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

function CategoryItem({ category, isSelected, onClick, onEdit, onDelete }: CategoryItemProps) {
  const [showActions, setShowActions] = useState(false)
  const FolderIcon = isSelected ? FolderOpen : Folder
  
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
      )}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <FolderIcon 
        className="h-4 w-4 shrink-0" 
        style={{ color: category.color }}
      />
      <span className="flex-1 truncate">{category.name}</span>
      
      {showActions ? (
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.()
            }}
          >
            <Pencil className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.()
            }}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      ) : (
        category.questionCount > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {category.questionCount}
          </Badge>
        )
      )}
    </div>
  )
}

// 创建分类对话框
function CreateCategoryDialog({ 
  open, 
  onOpenChange,
  onCreated
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void 
  onCreated?: () => void
}) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  
  const handleSubmit = async () => {
    if (!name.trim()) return
    
    setIsSubmitting(true)
    try {
      await createCategory(name.trim())
      toast({
        title: '成功',
        description: `分类 "${name.trim()}" 已创建`,
      })
      // 刷新分类列表
      onCreated?.()
      setName('')
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: '创建失败',
        description: error.message || '请重试',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>新建分类</DialogTitle>
          <DialogDescription>
            创建一个新的分类来组织你的问题
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="分类名称，如：物理、历史、编程"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 编辑分类对话框
function EditCategoryDialog({ 
  category,
  onClose,
}: { 
  category: { id: string; name: string } | null
  onClose: () => void
}) {
  const [name, setName] = useState(category?.name || '')
  
  // 当category变化时更新name
  useState(() => {
    if (category) setName(category.name)
  })
  
  const handleSubmit = async () => {
    if (!category || !name.trim()) return
    await updateCategory(category.id, { name: name.trim() })
    onClose()
  }
  
  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>编辑分类</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="分类名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
