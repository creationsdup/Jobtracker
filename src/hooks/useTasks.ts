import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface Task {
  id: string
  user_id: string
  title: string
  completed: boolean
  created_at: string
}

export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!userId) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setTasks(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const addTask = useCallback(async (title: string): Promise<string | null> => {
    if (!userId) return 'Non authentifié'
    const trimmed = title.trim()
    if (!trimmed) return null

    const { data, error } = await supabase
      .from('tasks')
      .insert({ user_id: userId, title: trimmed })
      .select()
      .single()

    if (error) return error.message
    setTasks((prev) => [data, ...prev])
    return null
  }, [userId])

  const toggleTask = useCallback(async (id: string, completed: boolean) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)))
    await supabase.from('tasks').update({ completed }).eq('id', id)
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }, [])

  return { tasks, loading, addTask, toggleTask, deleteTask, refetch: fetchTasks }
}
