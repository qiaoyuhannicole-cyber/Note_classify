'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { NotebookSidebar } from '@/components/notebook/notebook-sidebar'
import { QuestionList } from '@/components/notebook/question-list'
import { QuestionDetail } from '@/components/notebook/question-detail'
import { CreateQuestionDialog } from '@/components/notebook/create-question-dialog'
import { useQuestionsByCategory } from '@/hooks/use-notebook'
import { cn } from '@/lib/utils'
import {
  Plus,
  PanelLeftClose,
  PanelLeft,
  Network,
} from 'lucide-react'
import Link from 'next/link'

export default function NotebookPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  const questions = useQuestionsByCategory(selectedCategory)
  
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* 左侧边栏 */}
      <aside 
        className={cn(
          'border-r border-border transition-all duration-300 shrink-0',
          sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'
        )}
      >
        <NotebookSidebar
          selectedCategory={selectedCategory}
          onSelectCategory={(id) => {
            setSelectedCategory(id)
            setSelectedQuestionId(null)
          }}
        />
      </aside>
      
      {/* 中间内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            <h2 className="font-medium">
              {getCategoryTitle(selectedCategory)}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/graph">
                <Network className="h-4 w-4 mr-2" />
                知识图谱
              </Link>
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建问题
            </Button>
          </div>
        </header>
        
        {/* 问题列表 */}
        <div className={cn(
          'flex-1 overflow-hidden flex',
          selectedQuestionId ? 'divide-x divide-border' : ''
        )}>
          <div className={cn(
            'overflow-auto transition-all duration-300',
            selectedQuestionId ? 'w-1/2 xl:w-3/5' : 'w-full'
          )}>
            <QuestionList
              questions={questions}
              selectedId={selectedQuestionId}
              onSelect={setSelectedQuestionId}
            />
          </div>
          
          {/* 右侧详情面板 */}
          {selectedQuestionId && (
            <div className="w-1/2 xl:w-2/5 overflow-hidden">
              <QuestionDetail
                key={selectedQuestionId}
                questionId={selectedQuestionId}
                onClose={() => setSelectedQuestionId(null)}
                onDeleted={() => setSelectedQuestionId(null)}
              />
            </div>
          )}
        </div>
      </main>
      
      {/* 新建问题对话框 */}
      <CreateQuestionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={(id) => setSelectedQuestionId(id)}
        defaultCategoryId={
          selectedCategory !== 'all' && selectedCategory !== 'uncategorized' 
            ? selectedCategory 
            : null
        }
      />
    </div>
  )
}

function getCategoryTitle(categoryId: string): string {
  switch (categoryId) {
    case 'all':
      return '全部问题'
    case 'uncategorized':
      return '未分类'
    default:
      return '问题列表'
  }
}
