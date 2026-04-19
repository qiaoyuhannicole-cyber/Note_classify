'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useGraphData } from '@/hooks/use-notebook'
import { saveLayout, updateRelation, deleteRelation } from '@/lib/data-access'
import { RELATION_TYPE_LABELS, RELATION_TYPE_COLORS, type RelationType } from '@/types/notebook'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// 动态导入 ForceGraph2D，禁用 SSR
const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
)

interface KnowledgeGraphProps {
  width: number
  height: number
  onNodeClick?: (nodeId: string) => void
}

interface GraphNodeData {
  id: string
  text: string
  categoryId: string | null
  categoryName?: string
  categoryColor?: string
  completion: number
  x?: number
  y?: number
}

interface GraphLinkData {
  id: string
  type: RelationType
  note?: string
  source: GraphNodeData | string
  target: GraphNodeData | string
}

export function KnowledgeGraph({ width, height, onNodeClick }: KnowledgeGraphProps) {
  const graphRef = useRef<any>(null)
  const graphData = useGraphData()
  const [selectedLink, setSelectedLink] = useState<GraphLinkData | null>(null)
  const [editingLinkType, setEditingLinkType] = useState<RelationType>('extension')
  const [editingLinkNote, setEditingLinkNote] = useState('')
  
  // 转换数据格式
  const data = {
    nodes: graphData?.nodes.map(n => ({
      ...n,
      id: n.id,
    })) || [],
    links: graphData?.edges.map(e => ({
      ...e,
      source: e.source,
      target: e.target,
    })) || [],
  }
  
  // 节点拖拽结束时保存位置
  const handleNodeDragEnd = useCallback((node: GraphNodeData) => {
    if (node.x !== undefined && node.y !== undefined) {
      saveLayout(node.id, node.x, node.y)
    }
  }, [])
  
  // 节点点击
  const handleNodeClick = useCallback((node: GraphNodeData) => {
    onNodeClick?.(node.id)
  }, [onNodeClick])
  
  // 边点击
  const handleLinkClick = useCallback((link: GraphLinkData) => {
    setSelectedLink(link)
    setEditingLinkType(link.type)
    setEditingLinkNote(link.note || '')
  }, [])
  
  // 保存边的修改
  const handleSaveLink = async () => {
    if (!selectedLink) return
    await updateRelation(selectedLink.id, {
      type: editingLinkType,
      note: editingLinkNote,
    })
    setSelectedLink(null)
  }
  
  // 删除边
  const handleDeleteLink = async () => {
    if (!selectedLink) return
    await deleteRelation(selectedLink.id)
    setSelectedLink(null)
  }
  
  // 自定义节点绘制
  const nodeCanvasObject = useCallback((node: GraphNodeData, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.text.length > 15 ? node.text.slice(0, 15) + '...' : node.text
    const fontSize = 12 / globalScale
    const nodeRadius = 8
    
    // 绘制节点圆形
    ctx.beginPath()
    ctx.arc(node.x!, node.y!, nodeRadius, 0, 2 * Math.PI)
    ctx.fillStyle = node.categoryColor || '#6366f1'
    ctx.fill()
    
    // 如果完成度不足50%，添加半透明效果
    if (node.completion < 0.5) {
      ctx.globalAlpha = 0.5
    }
    
    // 绘制边框
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2 / globalScale
    ctx.stroke()
    
    ctx.globalAlpha = 1
    
    // 绘制标签
    ctx.font = `${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#1f2937'
    ctx.fillText(label, node.x!, node.y! + nodeRadius + fontSize)
  }, [])
  
  // 自定义边绘制
  const linkCanvasObject = useCallback((link: GraphLinkData, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source as GraphNodeData
    const end = link.target as GraphNodeData
    
    if (!start.x || !start.y || !end.x || !end.y) return
    
    // 绘制连线
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = RELATION_TYPE_COLORS[link.type] || '#9ca3af'
    ctx.lineWidth = 2 / globalScale
    ctx.stroke()
  }, [])
  
  // 居中视图
  useEffect(() => {
    if (graphRef.current && data.nodes.length > 0) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50)
      }, 500)
    }
  }, [data.nodes.length])
  
  if (!graphData?.canGenerate) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            {graphData?.qualifiedCount || 0} / {graphData?.totalCount || 0} 个问题可生成图谱
          </p>
          <p className="text-sm text-muted-foreground">
            至少需要2个完成一半以上的问题才能生成图谱
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <>
      <ForceGraph2D
        ref={graphRef}
        width={width}
        height={height}
        graphData={data}
        nodeId="id"
        nodeLabel={(node: any) => `${node.text}\n完成度: ${Math.round(node.completion * 100)}%`}
        nodeCanvasObject={nodeCanvasObject as any}
        nodePointerAreaPaint={(node: any, color: string, ctx: any) => {
          ctx.beginPath()
          ctx.arc(node.x!, node.y!, 12, 0, 2 * Math.PI)
          ctx.fillStyle = color
          ctx.fill()
        }}
        linkCanvasObject={linkCanvasObject as any}
        linkPointerAreaPaint={(link: any, _: string, ctx: any) => {
          const start = link.source as GraphNodeData
          const end = link.target as GraphNodeData
          if (!start.x || !start.y || !end.x || !end.y) return

          ctx.beginPath()
          ctx.moveTo(start.x, start.y)
          ctx.lineTo(end.x, end.y)
          ctx.lineWidth = 10
          ctx.stroke()
        }}
        onNodeClick={handleNodeClick as any}
        onNodeDragEnd={handleNodeDragEnd as any}
        onLinkClick={handleLinkClick as any}
        enableNodeDrag={true}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
      
      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur p-3 rounded-lg border shadow-sm">
        <p className="text-xs font-medium mb-2">关系类型</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(RELATION_TYPE_LABELS).map(([type, label]) => (
            <Badge 
              key={type}
              variant="outline"
              className="text-xs"
              style={{ 
                borderColor: RELATION_TYPE_COLORS[type as RelationType],
                color: RELATION_TYPE_COLORS[type as RelationType],
              }}
            >
              {label}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* 编辑关系对话框 */}
      <Dialog open={!!selectedLink} onOpenChange={(open) => !open && setSelectedLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑关系</DialogTitle>
            <DialogDescription>
              修改两个问题之间的关系类型和备注
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>关系类型</Label>
              <Select value={editingLinkType} onValueChange={(v) => setEditingLinkType(v as RelationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RELATION_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: RELATION_TYPE_COLORS[type as RelationType] }}
                        />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="添加关于这个关系的备注..."
                value={editingLinkNote}
                onChange={(e) => setEditingLinkNote(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDeleteLink}>
              删除关系
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedLink(null)}>
                取消
              </Button>
              <Button onClick={handleSaveLink}>
                保存
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
