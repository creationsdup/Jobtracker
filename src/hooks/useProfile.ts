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
  skills: string[]
  interests: string[]
  createdAt: string
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'email' | 'createdAt'>>

const MISSING_PROFILE_TABLE = 'PGRST205'

function storageKey(userId: string) {
  return `jobtracker-profile-fallback:${userId}`
}

function buildDefaultProfile(userId: string, fallbackEmail?: string | null): Profile {
  return {
    id: userId,
    fullName: '',
    email: fallbackEmail ?? '',
    phone: null,
    location: null,
    title: null,
    summary: null,
    website: null,
    linkedin: null,
    github: null,
    avatarUrl: null,
    skills: [],
    interests: [],
    createdAt: new Date().toISOString(),
  }
}

function readFallbackProfile(userId: string, fallbackEmail?: string | null): Profile {
  const base = buildDefaultProfile(userId, fallbackEmail)
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<Profile>
    return {
      ...base,
      ...parsed,
      skills: Array.isArray(parsed.skills) ? parsed.skills : base.skills,
      interests: Array.isArray(parsed.interests) ? parsed.interests : base.interests,
    }
  } catch {
    return base
  }
}

function writeFallbackProfile(profile: Profile) {
  window.localStorage.setItem(storageKey(profile.id), JSON.stringify(profile))
}

export function useProfile(userId: string | null, fallbackEmail?: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useLocalFallback, setUseLocalFallback] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!userId) { setProfile(null); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('Profile')
      .select('*')
      .eq('id', userId)
      .single()
    if (error?.code === MISSING_PROFILE_TABLE) {
      setUseLocalFallback(true)
      setProfile(readFallbackProfile(userId, fallbackEmail))
      setError(null)
      setLoading(false)
      return
    }
    if (error && error.code !== 'PGRST116') setError(error.message)
    else setProfile(data ?? buildDefaultProfile(userId, fallbackEmail))
    setLoading(false)
  }, [fallbackEmail, userId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const updateProfile = useCallback(async (updates: ProfileUpdate): Promise<string | null> => {
    if (!userId) return 'Non authentifié'
    if (useLocalFallback) {
      const next = {
        ...(profile ?? buildDefaultProfile(userId, fallbackEmail)),
        ...updates,
        email: fallbackEmail ?? profile?.email ?? '',
      } as Profile
      writeFallbackProfile(next)
      setProfile(next)
      return null
    }
    setSaving(true)
    const { data, error } = await supabase
      .from('Profile')
      .upsert({ id: userId, email: fallbackEmail ?? profile?.email ?? '', ...updates })
      .select()
      .single()
    setSaving(false)
    if (error?.code === MISSING_PROFILE_TABLE) {
      setUseLocalFallback(true)
      const next = {
        ...(profile ?? buildDefaultProfile(userId, fallbackEmail)),
        ...updates,
        email: fallbackEmail ?? profile?.email ?? '',
      } as Profile
      writeFallbackProfile(next)
      setProfile(next)
      setError(null)
      return null
    }
    if (error) { setError(error.message); return error.message }
    setProfile(data)
    return null
  }, [fallbackEmail, profile, profile?.email, useLocalFallback, userId])

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

  return { profile, loading, saving, error, updateProfile, uploadAvatar, refetch: fetchProfile, useLocalFallback }
}
