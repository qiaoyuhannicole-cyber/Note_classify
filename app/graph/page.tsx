'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { KnowledgeGraph } from '@/components/graph/knowledge-graph'
import { GraphControls } from '@/components/graph/graph-controls'
import { QuestionDetail } from '@/components/notebook/question-detail'
import { useCanGenerateGraph } from '@/hooks/use-notebook'
import { cn } from '@/lib/utils'
import { ArrowLeft, X, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  
  const canGenerate = useCanGenerateGraph()
  
  // 监听容器尺寸变化
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({
          width: rect.width,
          height: rect.height,
        })
      }
    }
    
    updateDimensions()
    
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    
    return () => resizeObserver.disconnect()
  }, [])
  
  // 导出PNG
  const handleExportPNG = useCallback(() => {
    // 获取canvas元素
    const canvas = containerRef.current?.querySelector('canvas')
    if (!canvas) return
    
    const link = document.createElement('a')
    link.download = `knowledge-graph-${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])
  
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 顶部工具栏 */}
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Link>
          </Button>
          <h1 className="font-semibold text-lg">知识图谱</h1>
        </div>
        
        <GraphControls onExportPNG={handleExportPNG} />
      </header>
      
      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 图谱区域 */}
        <div 
          ref={containerRef}
          className={cn(
            'flex-1 relative',
            selectedQuestionId ? 'w-2/3' : 'w-full'
          )}
        >
          {canGenerate?.canGenerate === false ? (
            <div className="h-full flex items-center justify-center p-8">
              <Alert variant="default" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>无法生成图谱</AlertTitle>
                <AlertDescription>
                  {canGenerate.message}
                  <br /><br />
                  请先完善至少2个问题的答案（每个问题至少填写50%的答案角度）。
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <KnowledgeGraph
              width={dimensions.width}
              height={dimensions.height}
              onNodeClick={setSelectedQuestionId}
            />
          )}
        </div>
        
        {/* 侧边详情面板 */}
        {selectedQuestionId && (
          <div className="w-1/3 border-l overflow-hidden">
            <QuestionDetail
              questionId={selectedQuestionId}
              onClose={() => setSelectedQuestionId(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
