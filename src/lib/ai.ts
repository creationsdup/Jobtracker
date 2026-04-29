import { supabase } from '@/lib/supabase'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

function getOpenAIApiKey(): string | null {
  const key = import.meta.env.VITE_OPENAI_API_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : null
}

export function isAiConfigured(): boolean {
  return true
}

export function getAiConfigurationHint(): string {
  return 'Déployez la fonction Supabase ai-assistant avec OPENAI_API_KEY, ou ajoutez VITE_OPENAI_API_KEY en local.'
}

async function callEdgeFunction<T>(payload: { systemPrompt: string; userContent: string; maxTokens: number; json: boolean }): Promise<T | null> {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: payload,
  })

  if (error) return null
  return (data ?? null) as T | null
}

export async function generateStructuredData<T>(systemPrompt: string, userContent: string, maxTokens = 1400): Promise<T> {
  const edgeResult = await callEdgeFunction<T>({ systemPrompt, userContent, maxTokens, json: true })
  if (edgeResult) return edgeResult

  const apiKey = getOpenAIApiKey()
  if (!apiKey) {
    throw new Error(getAiConfigurationHint())
  }

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = (body as { error?: { message?: string } }).error?.message ?? res.statusText
    throw new Error(`OpenAI : ${msg}`)
  }

  const json = await res.json()
  const content = json.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('Réponse IA inattendue')
  }

  return JSON.parse(content) as T
}

export async function generateText(systemPrompt: string, userContent: string, maxTokens = 1200): Promise<string> {
  const edgeResult = await callEdgeFunction<{ text: string }>({ systemPrompt, userContent, maxTokens, json: false })
  if (edgeResult?.text?.trim()) return edgeResult.text.trim()

  const apiKey = getOpenAIApiKey()
  if (!apiKey) {
    throw new Error(getAiConfigurationHint())
  }

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = (body as { error?: { message?: string } }).error?.message ?? res.statusText
    throw new Error(`OpenAI : ${msg}`)
  }

  const json = await res.json()
  const content = json.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Réponse IA vide')
  }

  return content.trim()
}
