import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { CvDocument, CvStatus } from '@/lib/types'
import { validateCvFile } from '@/lib/cvLibrary'
import { extractCvText } from '@/lib/cvTextExtraction'
import { analyzeCvAts } from '@/lib/ai'

export function useCvDocuments(userId: string | null) {
  const [cvDocuments, setCvDocuments] = useState<CvDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCvDocuments = useCallback(async () => {
    if (!userId) { setCvDocuments([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('cv_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setCvDocuments(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchCvDocuments() }, [fetchCvDocuments])

  async function uploadCv(file: File): Promise<{ data: CvDocument | null; error: string | null }> {
    if (!userId) return { data: null, error: 'Non authentifié' }

    const validationError = validateCvFile(file)
    if (validationError) return { data: null, error: validationError }

    const id = crypto.randomUUID()
    const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx'
    const filePath = `${userId}/${id}/${file.name}`

    const { error: uploadError } = await supabase.storage.from('cv-documents').upload(filePath, file)
    if (uploadError) return { data: null, error: `Erreur d'upload : ${uploadError.message}` }

    const { data, error } = await supabase
      .from('cv_documents')
      .insert({
        id,
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_type: fileType,
        file_size: file.size,
        status: 'to_review',
      })
      .select()
      .single()

    if (error) {
      await supabase.storage.from('cv-documents').remove([filePath])
      return { data: null, error: error.message }
    }

    setCvDocuments((prev) => [data, ...prev])
    return { data, error: null }
  }

  async function updateStatus(id: string, status: CvStatus): Promise<string | null> {
    const { data, error } = await supabase
      .from('cv_documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    setCvDocuments((prev) => prev.map((cv) => (cv.id === id ? data : cv)))
    return null
  }

  async function updateAtsScore(id: string, score: number): Promise<string | null> {
    const { data, error } = await supabase
      .from('cv_documents')
      .update({ ats_score: score, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    setCvDocuments((prev) => prev.map((cv) => (cv.id === id ? data : cv)))
    return null
  }

  async function deleteCv(id: string): Promise<string | null> {
    const cv = cvDocuments.find((c) => c.id === id)
    if (!cv) return 'CV introuvable'
    const { error: storageError } = await supabase.storage.from('cv-documents').remove([cv.file_path])
    if (storageError) return storageError.message
    const { error } = await supabase.from('cv_documents').delete().eq('id', id)
    if (error) return error.message
    setCvDocuments((prev) => prev.filter((c) => c.id !== id))
    return null
  }

  async function getSignedUrl(filePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage.from('cv-documents').createSignedUrl(filePath, 60 * 5)
    if (error) return null
    return data.signedUrl
  }

  async function getCvText(cv: CvDocument): Promise<string> {
    const { data, error } = await supabase.storage.from('cv-documents').download(cv.file_path)
    if (error || !data) throw new Error(error?.message ?? 'Téléchargement du CV impossible')
    const arrayBuffer = await data.arrayBuffer()
    return extractCvText(cv.file_type, arrayBuffer)
  }

  async function reanalyze(cv: CvDocument): Promise<string | null> {
    try {
      const cvText = await getCvText(cv)
      const result = await analyzeCvAts({ cvText })
      return updateAtsScore(cv.id, result.score)
    } catch (err) {
      return err instanceof Error ? err.message : 'Erreur inattendue'
    }
  }

  return {
    cvDocuments,
    loading,
    error,
    uploadCv,
    updateStatus,
    updateAtsScore,
    deleteCv,
    getSignedUrl,
    getCvText,
    reanalyze,
    refetch: fetchCvDocuments,
  }
}
