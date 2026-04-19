'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useGraphData } from '@/hooks/use-notebook'
import { downloadNotebook, exportToJSON } from '@/lib/utils/export'
import { clearLayouts } from '@/lib/db'
import {
  Download,
  Image,
  FileJson,
  RotateCcw,
  ChevronDown,
  FileArchive,
} from 'lucide-react'

interface GraphControlsProps {
  onExportPNG?: () => void
  onExportSVG?: () => void
}

export function GraphControls({ onExportPNG, onExportSVG }: GraphControlsProps) {
  const graphData = useGraphData()
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportType, setExportType] = useState<'png' | 'svg' | 'json' | 'full'>('png')
  
  const handleExport = async () => {
    switch (exportType) {
      case 'png':
        onExportPNG?.()
        break
      case 'svg':
        onExportSVG?.()
        break
      case 'json':
        // 导出图谱JSON
        const jsonData = {
          nodes: graphData?.nodes || [],
          edges: graphData?.edges || [],
          exportedAt: new Date().toISOString(),
        }
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })
        downloadBlob(blob, `knowledge-graph-${new Date().toISOString().slice(0, 10)}.json`)
        break
      case 'full':
        // 导出完整笔记本
        await downloadNotebook()
        break
    }
    setShowExportDialog(false)
  }
  
  const handleResetLayout = async () => {
    await clearLayouts()
    // 刷新页面以重新加载图谱
    window.location.reload()
  }
  
  return (
    <>
      <div className="flex items-center gap-2">
        {/* 统计信息 */}
        <div className="text-sm text-muted-foreground mr-4">
          <span className="font-medium">{graphData?.nodes.length || 0}</span> 个节点
          <span className="mx-2">·</span>
          <span className="font-medium">{graphData?.edges.length || 0}</span> 条关系
        </div>
        
        {/* 重置布局 */}
        <Button variant="outline" size="sm" onClick={handleResetLayout}>
          <RotateCcw className="h-4 w-4 mr-2" />
          重置布局
        </Button>
        
        {/* 导出菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Download className="h-4 w-4 mr-2" />
              导出
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setExportType('png')
              setShowExportDialog(true)
            }}>
              <Image className="h-4 w-4 mr-2" />
              导出为 PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setExportType('json')
              setShowExportDialog(true)
            }}>
              <FileJson className="h-4 w-4 mr-2" />
              导出图谱 JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              setExportType('full')
              setShowExportDialog(true)
            }}>
              <FileArchive className="h-4 w-4 mr-2" />
              导出完整笔记本
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* 导出确认对话框 */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导出{getExportTypeName(exportType)}</DialogTitle>
            <DialogDescription>
              {getExportTypeDescription(exportType)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              取消
            </Button>
            <Button onClick={handleExport}>
              确认导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function getExportTypeName(type: string): string {
  switch (type) {
    case 'png': return 'PNG 图片'
    case 'svg': return 'SVG 矢量图'
    case 'json': return '图谱 JSON'
    case 'full': return '完整笔记本'
    default: return ''
  }
}

function getExportTypeDescription(type: string): string {
  switch (type) {
    case 'png': return '将当前知识图谱导出为PNG图片，适合分享和演示。'
    case 'svg': return '将当前知识图谱导出为SVG矢量图，适合高质量打印。'
    case 'json': return '导出图谱的节点和关系数据为JSON格式，可用于数据分析或其他工具。'
    case 'full': return '导出完整的笔记本数据，包括所有问题、答案、分类和关系，可用于备份或迁移。'
    default: return ''
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
