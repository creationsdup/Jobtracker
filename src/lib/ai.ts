import { supabase } from '@/lib/supabase'
import {
  buildAtsAnalysisUserContent,
  parseAtsAnalysisResponse,
  buildSuggestionsUserContent,
  parseSuggestionsResponse,
  type AtsAnalysisResult,
} from './cvLibrary'

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

async function callEdgeFunction<T>(payload: { systemPrompt: string; userContent: string; maxTokens: number; json: boolean; url?: string }): Promise<T | null> {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: payload,
  })

  if (error) return null
  return (data ?? null) as T | null
}

/**
 * `url`, si fourni, est scrapé côté edge function (sans contrainte CORS) et son contenu
 * remplace `userContent` pour l'analyse. Si le scraping échoue ou que l'edge function
 * n'est pas disponible, `userContent` est utilisé tel quel (le modèle infère depuis l'URL seule).
 */
export async function generateStructuredData<T>(systemPrompt: string, userContent: string, maxTokens = 1400, url?: string): Promise<T> {
  const edgeResult = await callEdgeFunction<T>({ systemPrompt, userContent, maxTokens, json: true, url })
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

/**
 * Identifie le nom de domaine du site officiel d'une entreprise à partir de son nom, sigle ou
 * marque commerciale (ex: "SNCF" -> "sncf.com"). Alimente la banque de logos partagée
 * (`company_domains`) quand la saisie de l'utilisateur ne correspond à aucune entrée connue.
 */
export async function guessCompanyDomain(companyName: string): Promise<string | null> {
  const trimmed = companyName.trim()
  if (!trimmed) return null

  try {
    const result = await generateStructuredData<{ domain: string | null }>(
      'Tu identifies le nom de domaine du site web officiel d\'une entreprise à partir de son nom, sigle ou marque commerciale (ex: "SNCF" -> "sncf.com", "EDF" -> "edf.fr"). Réponds uniquement avec un JSON {"domain": "exemple.com"} contenant un nom de domaine nu (sans https://, sans www.), ou {"domain": null} si tu n\'es pas raisonnablement certain de l\'entreprise ou de son domaine.',
      trimmed,
      200,
    )
    const domain = result?.domain
    if (typeof domain !== 'string') return null

    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
    if (!cleaned || !cleaned.includes('.') || /\s/.test(cleaned)) return null
    return cleaned
  } catch {
    return null
  }
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

export interface GeneratedGoal {
  target_title: string | null
  target_roles: string[]
  contract_types: string[]
  locations: string[]
  target_companies: string[]
  sectors: string[]
  keywords_wanted: string[]
  keywords_excluded: string[]
  experience_level: string[]
  scoring_priorities: string | null
  timeline: '1m' | '3m' | '6m' | '12m' | null
  personal_target: number | null
}

const GOAL_SYSTEM_PROMPT = `Tu es un assistant qui transforme une description libre de recherche d'emploi en objectif structuré pour une plateforme de suivi de candidatures.
Réponds UNIQUEMENT avec un JSON valide, sans markdown ni texte autour, au format exact suivant :
{
  "target_title": "string | null (intitulé cible court, ex: \\"Chef de projet innovation\\")",
  "target_roles": ["string"] (postes recherchés, ex: ["Chef de projet", "PMO"]),
  "contract_types": ["string"] (UNIQUEMENT parmi ces valeurs exactes : "CDI", "CDD", "Stage", "Alternance", "Freelance", "Mission" — omets si non mentionné, n'invente jamais d'autre valeur),
  "locations": ["string"] (villes, régions ou pays acceptés),
  "target_companies": ["string"] (entreprises visées nommément),
  "sectors": ["string"] (secteurs d'activité, ex: ["Transport", "Innovation"]),
  "keywords_wanted": ["string"] (mots-clés métier à privilégier),
  "keywords_excluded": ["string"] (mots-clés à éviter),
  "experience_level": ["string"] (niveau d'expérience recherché, ex: ["junior", "0-2 ans"]),
  "scoring_priorities": "string | null (résumé libre d'une phrase des priorités, informatif uniquement)",
  "timeline": "'1m' | '3m' | '6m' | '12m' | null (urgence de la recherche : 1m = moins d'1 mois, 3m = 1 à 3 mois, 6m = 3 à 6 mois, 12m = plus de 6 mois ; null si aucune urgence n'est mentionnée)",
  "personal_target": "number | null (nombre de candidatures par mois visé, UNIQUEMENT si explicitement mentionné dans le texte, sinon null)"
}
Règle stricte : un champ non mentionné dans le texte doit être un tableau vide [] ou null — n'invente JAMAIS de valeur pour "remplir" un champ.`

export async function generateGoalFromText(freeText: string): Promise<GeneratedGoal> {
  return generateStructuredData<GeneratedGoal>(GOAL_SYSTEM_PROMPT, freeText, 800)
}

const ATS_ANALYSIS_SYSTEM_PROMPT = `Tu es un expert en optimisation de CV pour les systèmes ATS (Applicant Tracking System).
Analyse le CV fourni (et la description de poste si elle est donnée) et évalue sa compatibilité ATS.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, au format :
{
  "score": number (0 à 100, compatibilité ATS globale),
  "missingKeywords": ["string"] (mots-clés importants absents du CV, déduits de la description de poste si fournie, sinon des standards du métier détecté),
  "recommendations": "string (2 à 4 phrases de recommandations concrètes pour améliorer le score)"
}
Contraintes : n'invente pas de mots-clés non pertinents, base-toi uniquement sur le contenu fourni.`

export async function analyzeCvAts(input: {
  cvText: string
  jobTitle?: string
  jobDescription?: string
}): Promise<AtsAnalysisResult> {
  const userContent = buildAtsAnalysisUserContent(input.cvText, input.jobTitle, input.jobDescription)
  const raw = await generateStructuredData<unknown>(ATS_ANALYSIS_SYSTEM_PROMPT, userContent, 1200)
  return parseAtsAnalysisResponse(raw)
}

const LIBRARY_SUGGESTIONS_SYSTEM_PROMPT = `Tu es un conseiller carrière qui analyse la bibliothèque d'expériences et de CV d'un utilisateur.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, au format :
{ "suggestions": ["string"] }
Donne 2 à 3 suggestions courtes et actionnables (compétences à renforcer, expériences à valoriser, ou CV à mettre à jour). N'invente pas de faits sur l'utilisateur, base-toi uniquement sur les données fournies.`

export async function generateLibrarySuggestions(input: {
  experiences: { title: string; organization: string; skills: string[] }[]
  cvDocuments: { file_name: string; ats_score: number | null }[]
}): Promise<string[]> {
  const userContent = buildSuggestionsUserContent(input.experiences, input.cvDocuments)
  const raw = await generateStructuredData<unknown>(LIBRARY_SUGGESTIONS_SYSTEM_PROMPT, userContent, 600)
  return parseSuggestionsResponse(raw)
}
