import { useState, useMemo, useRef, useCallback } from 'react'
import {
  Target, MapPin, Briefcase, Clock, Building2, Pencil, X,
  TrendingUp, Zap, Users, FileText, CheckCircle2, AlertCircle,
  Lightbulb, ChevronRight, BarChart2, Award, Plus,
} from 'lucide-react'
import { useGoals, type GoalUpdate, type GoalAlignment } from '@/hooks/useGoals'
import type { Application, UserGoal } from '@/lib/types'
import { cn } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTRACT_OPTIONS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance', 'Mission']

const TIMELINE_OPTIONS = [
  { value: '1m',  label: 'Urgent',       sub: '< 1 mois' },
  { value: '3m',  label: 'Court terme',  sub: '1–3 mois' },
  { value: '6m',  label: 'Moyen terme',  sub: '3–6 mois' },
  { value: '12m', label: 'Long terme',   sub: '> 6 mois' },
]

const DEFAULT_ACTIONS = [
  { id: '1', label: 'Optimiser mon CV principal',                 done: false },
  { id: '2', label: 'Envoyer 10 candidatures cette semaine',      done: false },
  { id: '3', label: 'Développer mes compétences clés',            done: false },
  { id: '4', label: 'Contacter 5 recruteurs sur LinkedIn',        done: false },
  { id: '5', label: 'Préparer des réponses aux questions types',  done: false },
]

// ─── Utilities ────────────────────────────────────────────────────────────────

function targetDateFromOption(opt: string): string {
  const now = new Date()
  const months = ({ '1m': 1, '3m': 3, '6m': 6, '12m': 12 } as Record<string, number>)[opt] ?? 3
  now.setMonth(now.getMonth() + months)
  return now.toISOString().slice(0, 10)
}

function optionFromTargetDate(date: string | null): string {
  if (!date) return ''
  const diff = Math.round((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
  if (diff <= 1) return '1m'
  if (diff <= 3) return '3m'
  if (diff <= 6) return '6m'
  return '12m'
}

function formatDateShort(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

function getWeeklyData(applications: Application[]) {
  return Array.from({ length: 8 }, (_, i) => {
    const end = new Date()
    end.setDate(end.getDate() - i * 7)
    const start = new Date(end)
    start.setDate(start.getDate() - 7)
    return {
      label: `S-${i === 0 ? 'act.' : i}`,
      count: applications.filter((a) => {
        const d = new Date(a.createdAt)
        return d >= start && d < end
      }).length,
    }
  }).reverse()
}

interface ScoreBreakdown {
  global: number
  cv: number
  applications: number
  matching: number
  network: number
}

function computeScore(
  goal: UserGoal | null,
  apps: Application[],
  alignment: GoalAlignment,
): ScoreBreakdown {
  const now = new Date()
  const thisMonthApps = apps.filter((a) => {
    const d = new Date(a.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const target = goal?.personal_target ?? 10
  const cvScore    = (goal?.target_positions?.length || goal?.type) ? 72 : 25
  const appScore   = Math.min(100, Math.round((thisMonthApps / target) * 100))
  const zoneS      = goal?.zones?.length       ? alignment.zoneMatch     : 50
  const contractS  = goal?.contract_types?.length ? alignment.contractMatch : 50
  const matchScore = Math.round((zoneS + contractS) / 2)
  const networkScore = goal?.target_companies?.length
    ? Math.min(90, 30 + goal.target_companies.length * 15)
    : 20

  const global = Math.round((cvScore + appScore + matchScore + networkScore) / 4)
  return { global, cv: cvScore, applications: appScore, matching: matchScore, network: networkScore }
}

function buildSentence(goal: UserGoal | null): string {
  if (!goal) return ''
  const parts: string[] = []
  const positions = goal.target_positions?.length ? goal.target_positions : (goal.type ? [goal.type] : [])
  if (positions.length) parts.push(positions.slice(0, 2).join(' ou '))
  if (goal.contract_types?.length) parts.push(`en ${goal.contract_types.join(' / ')}`)
  if (goal.zones?.length) parts.push(`à ${goal.zones.slice(0, 2).join(' / ')}`)
  if (goal.target_date) parts.push(`avant ${formatDateShort(goal.target_date)}`)
  return parts.join(' ')
}

// ─── Primitive sub-components ────────────────────────────────────────────────

function ScoreRing({ value, size = 88, sw = 9, color }: { value: number; size?: number; sw?: number; color: string }) {
  const r   = (size - sw) / 2
  const c   = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={sw} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${c - off} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray .7s ease' }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--color-ink)">
        {value}%
      </text>
    </svg>
  )
}

function MetricBar({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <Icon size={11} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] font-medium truncate" style={{ color: 'var(--color-muted)' }}>{label}</span>
          <span className="text-[11px] font-bold ml-2" style={{ color: 'var(--color-ink)' }}>{value}%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${value}%`, background: color }}
          />
        </div>
      </div>
    </div>
  )
}

function TagInput({ tags, placeholder, onChange }: { tags: string[]; placeholder: string; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  function add() {
    const v = draft.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setDraft('')
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border cursor-text min-h-[40px] transition-colors focus-within:border-indigo-400"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      onClick={() => ref.current?.focus()}
    >
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
          {t}
          <button type="button" className="opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); onChange(tags.filter((x) => x !== t)) }}>
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        className="flex-1 min-w-[80px] border-0 bg-transparent text-xs outline-none"
        style={{ color: 'var(--color-ink)' }}
        placeholder={tags.length === 0 ? placeholder : 'Ajouter…'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          if (e.key === 'Backspace' && !draft) onChange(tags.slice(0, -1))
        }}
        onBlur={add}
      />
    </div>
  )
}

// ─── Section: Goal Header ─────────────────────────────────────────────────────

function GoalObjectiveHeader({ goal, onEdit }: { goal: UserGoal | null; onEdit: () => void }) {
  const sentence = buildSentence(goal)
  const isEmpty  = !goal || !sentence

  return (
    <div
      className="rounded-2xl p-5 flex items-start justify-between gap-4"
      style={{
        background: 'linear-gradient(135deg, #6c3de0 0%, #4f46e5 100%)',
        boxShadow: '0 8px 32px rgba(99, 60, 220, 0.25)',
      }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Target size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/70 mb-1 uppercase tracking-wide">Objectif de recherche</p>
          {isEmpty ? (
            <p className="text-white/60 text-sm italic">Aucun objectif défini — cliquez sur Modifier pour commencer.</p>
          ) : (
            <p className="text-white font-semibold text-base leading-snug">🎯 {sentence}</p>
          )}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 text-white hover:bg-white/30 transition-colors flex-shrink-0"
      >
        <Pencil size={12} />
        Modifier
      </button>
    </div>
  )
}

// ─── Section: Strategy Grid ───────────────────────────────────────────────────

interface StratCardProps {
  icon: React.ElementType
  label: string
  color: string
  bg: string
  children: React.ReactNode
}

function StratCard({ icon: Icon, label, color, bg, children }: StratCardProps) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: bg }}>
          <Icon size={13} style={{ color }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

function EmptyChip() {
  return <span className="text-xs italic" style={{ color: 'var(--color-muted)' }}>Non défini</span>
}

function Chip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ color, background: bg }}>
      {label}
    </span>
  )
}

function StrategyGrid({ goal }: { goal: UserGoal | null }) {
  const positions = goal?.target_positions?.length
    ? goal.target_positions
    : (goal?.type ? [goal.type] : [])

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Postes ciblés — full width */}
      <div className="col-span-2">
        <StratCard icon={Target} label="Postes ciblés" color="#6366f1" bg="#eef2ff">
          {positions.length
            ? <div className="flex flex-wrap gap-1.5">
                {positions.map((p) => <Chip key={p} label={p} color="#6366f1" bg="#eef2ff" />)}
              </div>
            : <EmptyChip />}
        </StratCard>
      </div>

      {/* Délai */}
      <StratCard icon={Clock} label="Délai" color="#6366f1" bg="#eef2ff">
        {goal?.target_date
          ? <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
              avant {formatDateShort(goal.target_date)}
            </p>
          : <EmptyChip />}
      </StratCard>

      {/* Contrats */}
      <StratCard icon={Briefcase} label="Contrat" color="#0891b2" bg="#e0f2fe">
        {goal?.contract_types?.length
          ? <div className="flex flex-wrap gap-1">
              {goal.contract_types.map((c) => <Chip key={c} label={c} color="#0891b2" bg="#e0f2fe" />)}
            </div>
          : <EmptyChip />}
      </StratCard>

      {/* Zones */}
      <StratCard icon={MapPin} label="Zone géo." color="#059669" bg="#d1fae5">
        {goal?.zones?.length
          ? <div className="flex flex-wrap gap-1">
              {goal.zones.map((z) => <Chip key={z} label={z} color="#059669" bg="#d1fae5" />)}
            </div>
          : <EmptyChip />}
      </StratCard>

      {/* Entreprises */}
      <StratCard icon={Building2} label="Entreprises cibles" color="#d97706" bg="#fef3c7">
        {goal?.target_companies?.length
          ? <div className="flex flex-col gap-0.5">
              {goal.target_companies.slice(0, 3).map((c) => (
                <div key={c} className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center text-[9px] font-bold text-amber-700 flex-shrink-0">
                    {c[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-medium truncate" style={{ color: 'var(--color-ink)' }}>{c}</span>
                </div>
              ))}
              {goal.target_companies.length > 3 && (
                <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                  +{goal.target_companies.length - 3} autres
                </span>
              )}
            </div>
          : <EmptyChip />}
      </StratCard>
    </div>
  )
}

// ─── Section: Action Plan ─────────────────────────────────────────────────────

interface ActionItem { id: string; label: string; done: boolean }

function ActionPlan({ actions, onToggle }: { actions: ActionItem[]; onToggle: (id: string) => void }) {
  const done = actions.filter((a) => a.done).length
  const pct  = Math.round((done / actions.length) * 100)

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#eef2ff' }}>
            <CheckCircle2 size={14} style={{ color: '#6366f1' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Plan d'action</span>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#eef2ff', color: '#6366f1' }}>
          {done}/{actions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: 'var(--color-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6c3de0, #4f46e5)' }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onToggle(a.id)}
            className="flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors hover:bg-gray-50 group"
          >
            <div className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
              a.done
                ? 'bg-indigo-500 border-indigo-500'
                : 'border-gray-300 group-hover:border-indigo-400',
            )}>
              {a.done && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
            </div>
            <span className={cn(
              'text-sm transition-all',
              a.done ? 'line-through opacity-40' : '',
            )} style={{ color: 'var(--color-ink)' }}>
              {a.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Section: Global Score ────────────────────────────────────────────────────

function GlobalScoreCard({ score }: { score: ScoreBreakdown }) {
  const color =
    score.global >= 75 ? '#10b981' :
    score.global >= 50 ? '#6366f1' :
    score.global >= 25 ? '#f59e0b' : '#ef4444'

  const label =
    score.global >= 75 ? 'Excellent' :
    score.global >= 50 ? 'En bonne voie' :
    score.global >= 25 ? 'À améliorer' : 'À démarrer'

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
          <Award size={14} style={{ color: '#d97706' }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Score global</span>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <ScoreRing value={score.global} color={color} />
        <div>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>{score.global}%</p>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
            {label}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <MetricBar label="CV adapté"          value={score.cv}           color="#6366f1" icon={FileText}   />
        <MetricBar label="Candidatures"        value={score.applications} color="#0891b2" icon={TrendingUp}  />
        <MetricBar label="Matching offres"     value={score.matching}     color="#10b981" icon={Zap}         />
        <MetricBar label="Réseau ciblé"        value={score.network}      color="#d97706" icon={Users}       />
      </div>
    </div>
  )
}

// ─── Section: Quantified Goals ────────────────────────────────────────────────

function QuantifiedGoals({ goal, applications }: { goal: UserGoal | null; applications: Application[] }) {
  const now = new Date()
  const target = goal?.personal_target ?? 10

  const thisMonth = applications.filter((a) => {
    const d = new Date(a.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const interviews = applications.filter((a) => ['PHONE_SCREEN', 'INTERVIEW', 'TECHNICAL_TEST', 'OFFER', 'ACCEPTED'].includes(a.status)).length
  const offers     = applications.filter((a) => ['OFFER', 'ACCEPTED'].includes(a.status)).length

  const ROWS = [
    { label: 'Candidatures / mois', current: thisMonth, goal: target,                       color: '#6366f1', icon: TrendingUp },
    { label: 'Entretiens obtenus',  current: interviews, goal: Math.max(3, Math.round(target * 0.3)), color: '#0891b2', icon: Users     },
    { label: 'Offres reçues',       current: offers,     goal: Math.max(1, Math.round(target * 0.1)), color: '#10b981', icon: Award     },
  ]

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#d1fae5' }}>
          <Target size={14} style={{ color: '#059669' }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Objectifs quantifiés</span>
      </div>

      <div className="flex flex-col gap-3">
        {ROWS.map(({ label, current, goal: g, color, icon: Icon }) => {
          const pct = Math.min(100, Math.round((current / g) * 100))
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon size={12} style={{ color }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold" style={{ color: 'var(--color-ink)' }}>{current}</span>
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>/ {g}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Section: Weekly Chart ────────────────────────────────────────────────────

function WeeklyProgressChart({ applications }: { applications: Application[] }) {
  const weeks = useMemo(() => getWeeklyData(applications), [applications])
  const max   = Math.max(1, ...weeks.map((w) => w.count))

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e0f2fe' }}>
          <BarChart2 size={14} style={{ color: '#0891b2' }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Candidatures par semaine</span>
      </div>

      <div className="flex items-end gap-1.5 h-20">
        {weeks.map((w, i) => {
          const h = Math.round((w.count / max) * 64)
          const isLast = i === weeks.length - 1
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              {w.count > 0 && (
                <div
                  className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                >
                  {w.count} cand.
                </div>
              )}
              <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
                <div
                  className="w-full rounded-t-md transition-all duration-700"
                  style={{
                    height: w.count === 0 ? 3 : h,
                    background: isLast
                      ? 'linear-gradient(180deg, #6c3de0, #4f46e5)'
                      : 'var(--color-border)',
                    opacity: w.count === 0 ? 0.4 : 1,
                  }}
                />
              </div>
              <span className="text-[9px] font-medium text-center leading-tight" style={{ color: isLast ? '#6366f1' : 'var(--color-muted)' }}>
                {w.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Section: AI Suggestions ──────────────────────────────────────────────────

interface Suggestion { id: string; icon: React.ElementType; text: string; cta: string; color: string; bg: string }

function buildSuggestions(goal: UserGoal | null, score: ScoreBreakdown, alignment: GoalAlignment): Suggestion[] {
  const suggestions: Suggestion[] = []

  if (score.cv < 50) {
    suggestions.push({
      id: 'cv',
      icon: FileText,
      text: 'Votre profil de recherche est incomplet. Définissez le poste visé pour améliorer votre score CV.',
      cta: 'Définir l\'objectif',
      color: '#6366f1', bg: '#eef2ff',
    })
  }
  if (score.applications < 40) {
    suggestions.push({
      id: 'apps',
      icon: TrendingUp,
      text: 'Vous n\'atteignez pas votre objectif mensuel de candidatures. Augmentez votre cadence.',
      cta: 'Voir les candidatures',
      color: '#0891b2', bg: '#e0f2fe',
    })
  }
  if (!goal?.target_companies?.length) {
    suggestions.push({
      id: 'companies',
      icon: Building2,
      text: 'Aucune entreprise cible définie. Cibler des entreprises précises multiplie vos chances.',
      cta: 'Ajouter des entreprises',
      color: '#d97706', bg: '#fef3c7',
    })
  }
  if (alignment.offTargetApps.length > 2) {
    suggestions.push({
      id: 'align',
      icon: AlertCircle,
      text: `${alignment.offTargetApps.length} candidatures sont hors de vos objectifs géographiques ou de contrat.`,
      cta: 'Revoir les critères',
      color: '#ef4444', bg: '#fee2e2',
    })
  }
  if (score.network < 40) {
    suggestions.push({
      id: 'network',
      icon: Users,
      text: 'Votre réseau ciblé est faible. Connectez-vous avec des recruteurs dans vos entreprises cibles.',
      cta: 'Définir les cibles',
      color: '#059669', bg: '#d1fae5',
    })
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'ok',
      icon: CheckCircle2,
      text: 'Votre stratégie est bien configurée. Continuez sur cette lancée !',
      cta: 'Voir le tableau de bord',
      color: '#059669', bg: '#d1fae5',
    })
  }

  return suggestions.slice(0, 3)
}

function AISuggestions({ goal, score, alignment }: { goal: UserGoal | null; score: ScoreBreakdown; alignment: GoalAlignment }) {
  const suggestions = useMemo(() => buildSuggestions(goal, score, alignment), [goal, score, alignment])

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#fef3c7' }}>
          <Lightbulb size={14} style={{ color: '#d97706' }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>Recommandations</span>
      </div>

      <div className="flex flex-col gap-3">
        {suggestions.map((s) => (
          <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: s.bg }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${s.color}25` }}>
              <s.icon size={13} style={{ color: s.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed mb-1.5" style={{ color: 'var(--color-ink)' }}>{s.text}</p>
              <button className="text-[11px] font-semibold flex items-center gap-1 hover:gap-1.5 transition-all" style={{ color: s.color }}>
                {s.cta} <ChevronRight size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditGoalModalProps {
  goal: UserGoal | null
  saving: boolean
  onSave: (u: GoalUpdate) => void
  onClose: () => void
}

function EditGoalModal({ goal, saving, onSave, onClose }: EditGoalModalProps) {
  const initPositions = goal?.target_positions?.length
    ? goal.target_positions
    : (goal?.type ? [goal.type] : [])

  const [positions, setPositions] = useState<string[]>(initPositions)
  const [contracts, setContracts] = useState<string[]>(goal?.contract_types ?? [])
  const [zones, setZones]         = useState<string[]>(goal?.zones ?? [])
  const [companies, setCompanies] = useState<string[]>(goal?.target_companies ?? [])
  const [timeline, setTimeline]   = useState(optionFromTargetDate(goal?.target_date ?? null))
  const [target, setTarget]       = useState(goal?.personal_target ?? 10)

  function handleSave() {
    onSave({
      type: positions[0] ?? null,
      target_positions: positions,
      contract_types: contracts,
      zones,
      target_companies: companies,
      target_date: timeline ? targetDateFromOption(timeline) : null,
      personal_target: target,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#eef2ff' }}>
              <Target size={14} style={{ color: '#6366f1' }} />
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>Modifier mon objectif</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X size={15} style={{ color: 'var(--color-muted)' }} />
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Postes visés */}
          <div>
            <label className="block text-xs font-semibold mb-0.5" style={{ color: 'var(--color-ink)' }}>
              Postes visés
            </label>
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>
              Ajoutez un ou plusieurs intitulés de poste (Entrée pour valider).
            </p>
            <TagInput
              tags={positions}
              placeholder="Développeur Full-Stack, Product Manager…"
              onChange={setPositions}
            />
          </div>

          {/* Délai */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
              Délai de recherche
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TIMELINE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimeline(opt.value)}
                  className={cn(
                    'flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all',
                    timeline === opt.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-[var(--color-border)] hover:border-indigo-300',
                  )}
                >
                  <span className="text-xs font-semibold" style={{ color: timeline === opt.value ? '#6366f1' : 'var(--color-ink)' }}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contrats */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>
              Types de contrat
            </label>
            <div className="flex flex-wrap gap-2">
              {CONTRACT_OPTIONS.map((c) => {
                const active = contracts.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setContracts(active ? contracts.filter((x) => x !== c) : [...contracts, c])}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-[var(--color-border)] hover:border-indigo-300',
                    )}
                    style={active ? {} : { color: 'var(--color-muted)' }}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Zones */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>
              Zones géographiques
            </label>
            <TagInput tags={zones} placeholder="Paris, Lyon, Remote… (Entrée)" onChange={setZones} />
          </div>

          {/* Entreprises */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>
              Entreprises cibles
            </label>
            <TagInput tags={companies} placeholder="Google, Spotify… (Entrée)" onChange={setCompanies} />
          </div>

          {/* Objectif mensuel */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>
              Objectif mensuel de candidatures
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} max={200}
                className="input w-24 py-1.5 px-3 text-sm"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>candidatures / mois</span>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={onClose} className="btn btn-secondary text-sm">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-20">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: '#eef2ff' }}
      >
        <Target size={36} style={{ color: '#6366f1' }} />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-ink)' }}>
          Définissez votre objectif de recherche
        </h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-muted)' }}>
          Précisez votre stratégie pour suivre vos progrès et maximiser vos chances de trouver un poste.
        </p>
      </div>
      <button onClick={onEdit} className="btn btn-primary flex items-center gap-2">
        <Plus size={15} />
        Créer mon objectif
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface GoalsPageProps {
  userId: string
  applications: Application[]
}

export function GoalsPage({ userId, applications }: GoalsPageProps) {
  const { goal, loading, saving, saveGoal, alignment } = useGoals(userId, applications)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const score = useMemo(() => computeScore(goal, applications, alignment), [goal, applications, alignment])
  const hasGoal = !!(goal?.target_positions?.length || goal?.type || goal?.contract_types?.length || goal?.zones?.length)

  const handleSave = useCallback(async (updates: GoalUpdate) => {
    setError(null)
    const err = await saveGoal(updates)
    if (err) { setError(err); return }
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }, [saveGoal])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Chargement…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Status row */}
      {(saved || error) && (
        <div className="flex items-center gap-3 mb-4">
          {saved && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
              <CheckCircle2 size={15} />
              Enregistré
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}

      {/* No goal → empty state */}
      {!hasGoal && !editing ? (
        <EmptyState onEdit={() => setEditing(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-5">

          {/* ── Left column ─────────────────────────────────────── */}
          <div className="flex flex-col gap-5 min-w-0">
            <GoalObjectiveHeader goal={goal} onEdit={() => setEditing(true)} />
            <StrategyGrid goal={goal} />
            <AISuggestions goal={goal} score={score} alignment={alignment} />
          </div>

          {/* ── Right column ────────────────────────────────────── */}
          <div className="flex flex-col gap-5 min-w-0">
            <GlobalScoreCard score={score} />
            <QuantifiedGoals goal={goal} applications={applications} />
            <WeeklyProgressChart applications={applications} />
          </div>

        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditGoalModal
          goal={goal}
          saving={saving}
          onSave={handleSave}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
