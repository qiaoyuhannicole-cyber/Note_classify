'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Undo,
  Redo,
  ImageIcon,
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  onImageUpload?: (images: string[]) => void
  placeholder?: string
  className?: string
  images?: string[]
}

export function RichTextEditor({
  content,
  onChange,
  onImageUpload,
  placeholder = '在这里写下你的答案...',
  className,
  images = [],
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] px-3 py-2',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // 同步外部内容变化
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newImages: string[] = []
    
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      
      // 压缩并转换为 base64
      const base64 = await fileToBase64(file)
      newImages.push(base64)
      
      // 插入到编辑器
      if (editor) {
        editor.chain().focus().setImage({ src: base64 }).run()
      }
    }
    
    if (newImages.length > 0) {
      onImageUpload?.([...images, ...newImages])
    }
    
    // 清空 input
    e.target.value = ''
  }, [editor, images, onImageUpload])

  if (!editor) {
    return null
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* 工具栏 */}
      <div className="flex items-center gap-0.5 p-1 border-b bg-muted/30 flex-wrap">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="加粗"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="斜体"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Toggle
          size="sm"
          pressed={editor.isActive('heading', { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="标题"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="无序列表"
        >
          <List className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="有序列表"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="引用"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => fileInputRef.current?.click()}
          aria-label="上传图片"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />
        
        <div className="flex-1" />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="撤销"
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="重做"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      
      {/* 编辑区 */}
      <EditorContent editor={editor} className="min-h-[200px]" />
      
      {/* 图片预览区 */}
      {images.length > 0 && (
        <div className="p-2 border-t bg-muted/20">
          <p className="text-xs text-muted-foreground mb-2">
            已上传 {images.length} 张图片
          </p>
          <div className="flex gap-2 flex-wrap">
            {images.map((img, index) => (
              <div 
                key={index}
                className="w-16 h-16 rounded border overflow-hidden"
              >
                <img 
                  src={img} 
                  alt={`图片 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 文件转 base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // 先检查文件大小，如果超过 2MB 则压缩
    const maxSize = 2 * 1024 * 1024
    
    if (file.size <= maxSize) {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    } else {
      // 压缩图片
      compressImage(file, 0.8, 1200).then(resolve).catch(reject)
    }
  })
}

// 压缩图片
function compressImage(
  file: File,
  quality: number = 0.8,
  maxWidth: number = 1200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    img.onload = () => {
      let width = img.width
      let height = img.height
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      ctx?.drawImage(img, 0, 0, width, height)
      
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(dataUrl)
    }
    
    img.onerror = reject
    
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
