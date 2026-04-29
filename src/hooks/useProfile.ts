// src/hooks/useProfile.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  fullName: string
  email: string
  phone: string | null
  location: string | null
  title: string | null
  summary: string | null
  website: string | null
  linkedin: string | null
  github: string | null
  avatarUrl: string | null
  createdAt: string
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'email' | 'createdAt'>>

export function useProfile(userId: string | null, fallbackEmail?: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) { setProfile(null); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('Profile')
      .select('*')
      .eq('id', userId)
      .single()
    if (error && error.code !== 'PGRST116') setError(error.message)
    else setProfile(data ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const updateProfile = useCallback(async (updates: ProfileUpdate): Promise<string | null> => {
    if (!userId) return 'Non authentifié'
    setSaving(true)
    const { data, error } = await supabase
      .from('Profile')
      .upsert({ id: userId, email: fallbackEmail ?? profile?.email ?? '', ...updates })
      .select()
      .single()
    setSaving(false)
    if (error) { setError(error.message); return error.message }
    setProfile(data)
    return null
  }, [fallbackEmail, profile?.email, userId])

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!userId) return 'Non authentifié'
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) return uploadError.message
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return updateProfile({ avatarUrl: data.publicUrl })
  }, [userId, updateProfile])

  return { profile, loading, saving, error, updateProfile, uploadAvatar, refetch: fetchProfile }
}
