import type { WikipediaSuggestion } from '@/types/notebook'

const WIKIPEDIA_API_BASE = 'https://zh.wikipedia.org/w/api.php'

// 提取问题中的关键词
function extractKeywords(text: string): string[] {
  // 移除标点符号
  const cleaned = text.replace(/[？?！!。.，,、；;：:""''「」『』【】\s]+/g, ' ').trim()
  
  // 简单分词：按空格分割，过滤短词
  const words = cleaned.split(' ').filter(w => w.length >= 2)
  
  // 返回前3个关键词
  return words.slice(0, 3)
}

// 搜索Wikipedia相关词条
export async function searchWikipedia(query: string): Promise<WikipediaSuggestion[]> {
  try {
    const params = new URLSearchParams({
      action: 'opensearch',
      search: query,
      limit: '5',
      namespace: '0',
      format: 'json',
      origin: '*', // 支持CORS
    })

    const response = await fetch(`${WIKIPEDIA_API_BASE}?${params}`)
    
    if (!response.ok) {
      throw new Error('Wikipedia API request failed')
    }

    const data = await response.json()
    
    // opensearch返回格式: [query, [titles], [descriptions], [urls]]
    const titles = data[1] as string[]
    const descriptions = data[2] as string[]
    const urls = data[3] as string[]

    return titles.map((title, i) => ({
      title,
      description: descriptions[i] || undefined,
      url: urls[i] || undefined,
    }))
  } catch (error) {
    console.error('Wikipedia search error:', error)
    return []
  }
}

// 获取Wikipedia词条摘要
export async function getWikipediaSummary(title: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'extracts',
      exintro: 'true',
      explaintext: 'true',
      format: 'json',
      origin: '*',
    })

    const response = await fetch(`${WIKIPEDIA_API_BASE}?${params}`)
    
    if (!response.ok) {
      throw new Error('Wikipedia API request failed')
    }

    const data = await response.json()
    const pages = data.query.pages
    const pageId = Object.keys(pages)[0]
    
    if (pageId === '-1') return null
    
    return pages[pageId].extract || null
  } catch (error) {
    console.error('Wikipedia summary error:', error)
    return null
  }
}

// 基于问题生成延伸问题推荐
export async function generateExtensionSuggestions(
  questionText: string
): Promise<WikipediaSuggestion[]> {
  const keywords = extractKeywords(questionText)
  
  if (keywords.length === 0) {
    // 如果提取不到关键词，直接搜索整个问题
    return searchWikipedia(questionText.slice(0, 50))
  }

  // 搜索每个关键词
  const allSuggestions: WikipediaSuggestion[] = []
  
  for (const keyword of keywords) {
    const suggestions = await searchWikipedia(keyword)
    allSuggestions.push(...suggestions)
  }

  // 去重并限制数量
  const seen = new Set<string>()
  const uniqueSuggestions: WikipediaSuggestion[] = []
  
  for (const suggestion of allSuggestions) {
    const normalizedTitle = suggestion.title.toLowerCase()
    if (!seen.has(normalizedTitle)) {
      seen.add(normalizedTitle)
      uniqueSuggestions.push(suggestion)
    }
  }

  return uniqueSuggestions.slice(0, 5)
}

// 将Wikipedia建议转换为问题格式
export function suggestionToQuestion(suggestion: WikipediaSuggestion): string {
  // 常见问题模板
  const templates = [
    `什么是${suggestion.title}？`,
    `${suggestion.title}是什么？`,
    `${suggestion.title}的定义是什么？`,
  ]
  
  // 随机选择一个模板
  return templates[Math.floor(Math.random() * templates.length)]
}
