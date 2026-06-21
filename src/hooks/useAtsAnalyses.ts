import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { AtsAnalysis } from '@/lib/types'
import { analyzeCvAts } from '@/lib/ai'

export function useAtsAnalyses(userId: string | null) {
  const [atsAnalyses, setAtsAnalyses] = useState<AtsAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAtsAnalyses = useCallback(async () => {
    if (!userId) { setAtsAnalyses([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('ats_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setAtsAnalyses(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchAtsAnalyses() }, [fetchAtsAnalyses])

  async function createAnalysis(input: {
    cvId: string
    cvText: string
    title: string
    jobTitle?: string
    jobDescription?: string
  }): Promise<{ data: AtsAnalysis | null; error: string | null }> {
    if (!userId) return { data: null, error: 'Non authentifié' }

    try {
      const result = await analyzeCvAts({
        cvText: input.cvText,
        jobTitle: input.jobTitle,
        jobDescription: input.jobDescription,
      })

      const { data, error } = await supabase
        .from('ats_analyses')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          cv_id: input.cvId,
          title: input.title,
          job_description: input.jobDescription ?? null,
          score: result.score,
          missing_keywords: result.missingKeywords,
          recommendations: result.recommendations,
        })
        .select()
        .single()

      if (error) return { data: null, error: error.message }
      setAtsAnalyses((prev) => [data, ...prev])
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Erreur inattendue' }
    }
  }

  async function generateRecommendations(id: string, cvText: string): Promise<string | null> {
    const analysis = atsAnalyses.find((a) => a.id === id)
    if (!analysis) return 'Analyse introuvable'
    if (analysis.recommendations) return null

    try {
      const result = await analyzeCvAts({
        cvText,
        jobDescription: analysis.job_description ?? undefined,
      })
      const { data, error } = await supabase
        .from('ats_analyses')
        .update({ recommendations: result.recommendations })
        .eq('id', id)
        .select()
        .single()
      if (error) return error.message
      setAtsAnalyses((prev) => prev.map((a) => (a.id === id ? data : a)))
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Erreur inattendue'
    }
  }

  async function associateToApplication(id: string, applicationId: string | null): Promise<string | null> {
    const { data, error } = await supabase
      .from('ats_analyses')
      .update({ application_id: applicationId })
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    setAtsAnalyses((prev) => prev.map((a) => (a.id === id ? data : a)))
    return null
  }

  return {
    atsAnalyses,
    loading,
    error,
    createAnalysis,
    generateRecommendations,
    associateToApplication,
    refetch: fetchAtsAnalyses,
  }
}
