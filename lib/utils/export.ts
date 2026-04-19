import { db } from '@/lib/db'
import type { NotebookExport } from '@/types/notebook'

const EXPORT_VERSION = '1.0.0'

// 导出整个笔记本数据
export async function exportNotebook(): Promise<NotebookExport> {
  const [questions, perspectives, categories, relations, layouts] = await Promise.all([
    db.questions.toArray(),
    db.perspectives.toArray(),
    db.categories.toArray(),
    db.relations.toArray(),
    db.layouts.toArray(),
  ])

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date(),
    questions,
    perspectives,
    categories,
    relations,
    layouts,
  }
}

// 导出为JSON字符串
export async function exportToJSON(): Promise<string> {
  const data = await exportNotebook()
  return JSON.stringify(data, null, 2)
}

// 导出为Blob（用于下载）
export async function exportToBlob(): Promise<Blob> {
  const jsonString = await exportToJSON()
  return new Blob([jsonString], { type: 'application/json' })
}

// 导入笔记本数据
export async function importNotebook(data: NotebookExport): Promise<{
  success: boolean
  message: string
  stats?: {
    questions: number
    perspectives: number
    categories: number
    relations: number
  }
}> {
  try {
    // 验证数据格式
    if (!data.version || !data.questions || !Array.isArray(data.questions)) {
      return {
        success: false,
        message: '无效的数据格式',
      }
    }

    // 清空现有数据
    await db.transaction('rw', [
      db.questions,
      db.perspectives,
      db.categories,
      db.relations,
      db.layouts,
    ], async () => {
      await db.questions.clear()
      await db.perspectives.clear()
      await db.categories.clear()
      await db.relations.clear()
      await db.layouts.clear()

      // 导入新数据
      if (data.categories?.length) {
        await db.categories.bulkAdd(data.categories.map(c => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        })))
      }

      if (data.questions?.length) {
        await db.questions.bulkAdd(data.questions.map(q => ({
          ...q,
          createdAt: new Date(q.createdAt),
          updatedAt: new Date(q.updatedAt),
        })))
      }

      if (data.perspectives?.length) {
        await db.perspectives.bulkAdd(data.perspectives.map(p => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        })))
      }

      if (data.relations?.length) {
        await db.relations.bulkAdd(data.relations.map(r => ({
          ...r,
          createdAt: new Date(r.createdAt),
        })))
      }

      if (data.layouts?.length) {
        await db.layouts.bulkAdd(data.layouts)
      }
    })

    return {
      success: true,
      message: '导入成功',
      stats: {
        questions: data.questions?.length || 0,
        perspectives: data.perspectives?.length || 0,
        categories: data.categories?.length || 0,
        relations: data.relations?.length || 0,
      },
    }
  } catch (error) {
    console.error('Import error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '导入失败',
    }
  }
}

// 从文件导入
export async function importFromFile(file: File): Promise<ReturnType<typeof importNotebook>> {
  try {
    const text = await file.text()
    const data = JSON.parse(text) as NotebookExport
    return importNotebook(data)
  } catch (error) {
    console.error('File import error:', error)
    return {
      success: false,
      message: '文件解析失败，请确保文件格式正确',
    }
  }
}

// 下载文件
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 导出并下载
export async function downloadNotebook() {
  const blob = await exportToBlob()
  const timestamp = new Date().toISOString().slice(0, 10)
  downloadFile(blob, `knowledge-notebook-${timestamp}.json`)
}
