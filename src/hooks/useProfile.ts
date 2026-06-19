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
  language: 'fr' | 'en'
  remindersEnabled: boolean
  reminderThresholdDays: number
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'email' | 'createdAt'>>

const MISSING_PROFILE_TABLE = 'PGRST205'
const AVATAR_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

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
    language: 'fr',
    remindersEnabled: true,
    reminderThresholdDays: 7,
  }
}

async function ensureRemoteProfile(userId: string, fallbackEmail?: string | null) {
  const base = buildDefaultProfile(userId, fallbackEmail)
  const { data, error } = await supabase
    .from('Profile')
    .upsert({
      id: base.id,
      email: base.email,
      fullName: base.fullName,
      phone: base.phone,
      location: base.location,
      title: base.title,
      summary: base.summary,
      website: base.website,
      linkedin: base.linkedin,
      github: base.github,
      avatarUrl: base.avatarUrl,
      skills: base.skills,
      interests: base.interests,
      language: base.language,
      remindersEnabled: base.remindersEnabled,
      reminderThresholdDays: base.reminderThresholdDays,
    })
    .select()
    .single()

  return { data, error }
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
  // Strip data URLs before persisting to localStorage to avoid quota errors
  const toStore = { ...profile, avatarUrl: profile.avatarUrl?.startsWith('data:') ? null : profile.avatarUrl }
  window.localStorage.setItem(storageKey(profile.id), JSON.stringify(toStore))
}

export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return 'Format non supporté. Utilisez JPG, PNG, WebP ou GIF.'
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'Image trop volumineuse (max 5 Mo).'
  }
  return null
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
    if (error && error.code !== 'PGRST116') {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data) {
      setProfile(data)
      setError(null)
      setLoading(false)
      return
    }

    const ensured = await ensureRemoteProfile(userId, fallbackEmail)
    if (ensured.error?.code === MISSING_PROFILE_TABLE) {
      setUseLocalFallback(true)
      setProfile(readFallbackProfile(userId, fallbackEmail))
      setError(null)
      setLoading(false)
      return
    }
    if (ensured.error) setError(ensured.error.message)
    else {
      setProfile(ensured.data ?? buildDefaultProfile(userId, fallbackEmail))
      setError(null)
    }
    setLoading(false)
  }, [fallbackEmail, userId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const updateProfile = useCallback(async (updates: ProfileUpdate): Promise<string | null> => {
    if (!userId) return 'Non authentifié'

    if (useLocalFallback) {
      setSaving(true)
      const next = {
        ...(profile ?? buildDefaultProfile(userId, fallbackEmail)),
        ...updates,
        email: fallbackEmail ?? profile?.email ?? '',
      } as Profile
      writeFallbackProfile(next)
      setProfile(next)
      setSaving(false)
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
    setProfile(data ?? profile)
    return null
  }, [fallbackEmail, profile, useLocalFallback, userId])

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!userId) return 'Non authentifié'

    const validationError = validateAvatarFile(file)
    if (validationError) return validationError

    if (useLocalFallback) {
      // WHY: in fallback mode, data URLs can't be stored in localStorage (quota),
      // so we just block avatar upload and tell the user.
      return 'Avatar non disponible en mode hors-ligne. Reconnectez-vous pour uploader une photo.'
    }

    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${userId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) return `Erreur d'upload : ${uploadError.message}`

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return updateProfile({ avatarUrl: data.publicUrl })
  }, [updateProfile, useLocalFallback, userId])

  const updatePassword = useCallback(async (password: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ password })
    return error?.message ?? null
  }, [])

  const updateEmail = useCallback(async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ email })
    return error?.message ?? null
  }, [])

  const signOut = useCallback(async (): Promise<string | null> => {
    const { error } = await supabase.auth.signOut()
    return error?.message ?? null
  }, [])

  const deleteAccount = useCallback(async (): Promise<string | null> => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return 'Non authentifié'

    const { data, error } = await supabase.functions.invoke('delete-account', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (error) return error.message
    if (data?.error) return data.error as string

    await supabase.auth.signOut()
    return null
  }, [])

  return {
    profile,
    loading,
    saving,
    error,
    updateProfile,
    uploadAvatar,
    refetch: fetchProfile,
    useLocalFallback,
    updatePassword,
    updateEmail,
    signOut,
    deleteAccount,
  }
}
