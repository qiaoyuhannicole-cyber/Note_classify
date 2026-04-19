'use client'

import { supabase } from './supabase/client'
import * as indexedDB from './db'
import * as supabaseDB from './supabase/db'

// 检查是否使用Supabase
const isSupabaseConfigured = () => supabase !== null

// 统一的数据访问函数 - 透传所有参数
export async function createQuestion(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.createQuestion as any)(...args)
  }
  return (indexedDB.createQuestion as any)(...args)
}

export async function updateQuestion(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.updateQuestion as any)(...args)
  }
  return (indexedDB.updateQuestion as any)(...args)
}

export async function deleteQuestion(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.deleteQuestion as any)(...args)
  }
  return (indexedDB.deleteQuestion as any)(...args)
}

export async function createCategory(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.createCategory as any)(...args)
  }
  return (indexedDB.createCategory as any)(...args)
}

export async function updateCategory(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.updateCategory as any)(...args)
  }
  return (indexedDB.updateCategory as any)(...args)
}

export async function deleteCategory(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.deleteCategory as any)(...args)
  }
  return (indexedDB.deleteCategory as any)(...args)
}

export async function createRelation(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.createRelation as any)(...args)
  }
  return (indexedDB.createRelation as any)(...args)
}

export async function updateRelation(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.updateRelation as any)(...args)
  }
  return (indexedDB.updateRelation as any)(...args)
}

export async function deleteRelation(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.deleteRelation as any)(...args)
  }
  return (indexedDB.deleteRelation as any)(...args)
}

export async function createPerspective(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.createPerspective as any)(...args)
  }
  return (indexedDB.createPerspective as any)(...args)
}

export async function updatePerspective(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.updatePerspective as any)(...args)
  }
  return (indexedDB.updatePerspective as any)(...args)
}

export async function deletePerspective(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.deletePerspective as any)(...args)
  }
  return (indexedDB.deletePerspective as any)(...args)
}

export async function checkDuplicateQuestion(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.checkDuplicateQuestion as any)(...args)
  }
  return (indexedDB.checkDuplicateQuestion as any)(...args)
}

export async function saveLayout(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.saveLayout as any)(...args)
  }
  return (indexedDB.saveLayout as any)(...args)
}

export async function clearLayouts(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.clearLayouts as any)(...args)
  }
  return (indexedDB.clearLayouts as any)(...args)
}

export async function getCategory(...args: any[]) {
  if (isSupabaseConfigured()) {
    return (supabaseDB.getCategory as any)(...args)
  }
  return (indexedDB.getCategory as any)(...args)
}
