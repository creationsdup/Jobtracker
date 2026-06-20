import { useMemo, useRef, useState } from 'react'
import {
  Target, MapPin, Briefcase, Clock, Building2, Pencil, X, Plus,
  CheckCircle2, AlertCircle, Lightbulb, Layers, ThumbsUp, ThumbsDown, GraduationCap,
} from 'lucide-react'
import { useGoals, type GoalUpdate } from '@/hooks/useGoals'
import { calculateJobMatch, applicationToJobMatchInput, levelFor } from '@/lib/jobMatching'
import { matchLevelColor } from '@/utils/statusLabels'
import type { Application, UserGoal } from '@/lib/types'
import type { MatchLevel, MatchResult } from '@/types/jobMatching'
import { cn } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTRACT_OPTIONS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance', 'Mission']

const TIMELINE_OPTIONS = [
  { value: '1m',  label: 'Urgent',       sub: '< 1 mois' },
  { value: '3m',  label: 'Court terme',  sub: '1–3 mois' },
  { value: '6m',  label: 'Moyen terme',  sub: '3–6 mois' },
  { value: '12m', label: 'Long terme',   sub: '> 6 mois' },
]

const LEVELS: MatchLevel[] = ['Très cohérent', 'Cohérent', 'Moyen', 'Peu cohérent', 'Hors cible']

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

const ACTIVE_STATUSES = new Set(['WISHLIST', 'APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'TECHNICAL_TEST', 'OFFER', 'ACCEPTED'])

function computeMatches(goal: UserGoal | null, applications: Application[]): MatchResult[] {
  if (!goal) return []
  return applications
    .filter((a) => ACTIVE_STATUSES.has(a.status))
    .map((a) => calculateJobMatch(applicationToJobMatchInput(a), goal))
}

function buildRecommendations(goal: UserGoal | null, matches: MatchResult[]): string[] {
  const recs: string[] = []
  if (!goal) return ['Définissez votre objectif pour recevoir des recommandations personnalisées.']

  const roleCount = goal.target_roles.length + (goal.target_title ? 1 : 0)
  if (roleCount <= 1) {
    recs.push('Votre objectif est trop large : ajoutez davantage de postes ou intitulés ciblés pour affiner le matching.')
  }

  if (matches.length > 0) {
    const lowLocation = matches.filter((m) => m.categoryScores.location < 45).length
    if (lowLocation / matches.length > 0.4) {
      recs.push(`${lowLocation} candidature${lowLocation > 1 ? 's' : ''} sur ${matches.length} sont hors de votre zone géographique cible.`)
    }

    const goodSector = matches.filter((m) => m.categoryScores.sector >= 75).length
    if (goodSector / matches.length >= 0.5) {
      const pct = Math.round((goodSector / matches.length) * 100)
      recs.push(`${pct}% de vos candidatures sont dans vos secteurs cibles, ce qui est cohérent avec votre objectif.`)
    }

    const avgMissing = matches.reduce((sum, m) => sum + m.missingData.length, 0) / matches.length
    if (avgMissing >= 2) {
      recs.push('Certaines offres n\'ont pas assez d\'informations (notes, contrat, localisation) pour être correctement évaluées.')
    }
  }

  if (recs.length === 0) {
    recs.push('Votre objectif est bien défini et vos candidatures sont globalement alignées. Continuez ainsi !')
  }

  return recs.slice(0, 4)
}

// ─── Primitive sub-components ────────────────────────────────────────────────

function CardShell({ icon: Icon, iconColor, iconBg, title, children }: {
  icon: React.ElementType; iconColor: string; iconBg: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={14} style={{ color: iconColor }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</span>
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

function ChipList({ items, color, bg }: { items: string[]; color: string; bg: string }) {
  if (items.length === 0) return <EmptyChip />
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => <Chip key={i} label={i} color={color} bg={bg} />)}
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
      className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border cursor-text min-h-[40px] transition-colors focus-within:border-sky-400"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      onClick={() => ref.current?.focus()}
    >
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
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

// ─── Card 1: Objectif principal ──────────────────────────────────────────────

function MainObjectiveCard({ goal, onEdit }: { goal: UserGoal | null; onEdit: () => void }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start justify-between gap-4"
      style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
        boxShadow: '0 8px 32px rgba(0, 59, 92, 0.25)',
      }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Target size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/70 mb-1 uppercase tracking-wide">Objectif principal</p>
          {!goal?.target_title ? (
            <p className="text-white/60 text-sm italic">Aucun intitulé cible défini — cliquez sur Modifier pour commencer.</p>
          ) : (
            <p className="text-white font-semibold text-base leading-snug mb-2">🎯 {goal.target_title}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-white/80">
              <Briefcase size={12} />{goal?.contract_types.length ? goal.contract_types.join(' / ') : 'Contrat non défini'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/80">
              <MapPin size={12} />{goal?.locations.length ? goal.locations.slice(0, 3).join(' / ') : 'Localisation non définie'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/80">
              <Clock size={12} />{goal?.target_date ? `avant ${formatDateShort(goal.target_date)}` : 'Pas d\'échéance'}
            </span>
          </div>
          {goal?.scoring_priorities && (
            <p className="text-xs text-white/70 mt-2 italic">« {goal.scoring_priorities} »</p>
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

// ─── Card 2: Critères de recherche ───────────────────────────────────────────

function SearchCriteriaCard({ goal }: { goal: UserGoal | null }) {
  return (
    <CardShell icon={Layers} iconColor="var(--color-accent)" iconBg="var(--color-status-applied-bg)" title="Critères de recherche">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-muted)' }}>Postes ciblés</p>
          <ChipList items={goal?.target_roles ?? []} color="var(--color-accent)" bg="var(--color-status-applied-bg)" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-muted)' }}>Secteurs</p>
          <ChipList items={goal?.sectors ?? []} color="var(--color-primary)" bg="var(--color-bg-light)" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-muted)' }}>Entreprises cibles</p>
          <ChipList items={goal?.target_companies ?? []} color="var(--color-warning)" bg="var(--color-status-interview-bg)" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
            <ThumbsUp size={11} />Mots-clés positifs
          </p>
          <ChipList items={goal?.keywords_wanted ?? []} color="var(--color-success)" bg="var(--color-status-offer-bg)" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
            <ThumbsDown size={11} />Mots-clés à éviter
          </p>
          <ChipList items={goal?.keywords_excluded ?? []} color="var(--color-danger)" bg="var(--color-status-rejected-bg)" />
        </div>
      </div>
    </CardShell>
  )
}

// ─── Card 3: Score global de cohérence ───────────────────────────────────────

function GlobalCoherenceCard({ matches }: { matches: MatchResult[] }) {
  const avg = matches.length === 0 ? null : Math.round(matches.reduce((s, m) => s + m.totalScore, 0) / matches.length)

  return (
    <CardShell icon={Building2} iconColor="var(--color-warning)" iconBg="var(--color-status-interview-bg)" title="Score global de cohérence">
      {avg === null ? (
        <p className="text-sm italic" style={{ color: 'var(--color-muted)' }}>
          Aucune candidature active pour le moment — le score apparaîtra dès votre première candidature.
        </p>
      ) : (
        <div className="flex items-center gap-4">
          <p className="text-3xl font-bold" style={{ color: matchLevelColor(levelFor(avg)).fg }}>
            {avg}%
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Moyenne sur {matches.length} candidature{matches.length > 1 ? 's' : ''} active{matches.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </CardShell>
  )
}

// ─── Card 4: Répartition des candidatures ────────────────────────────────────

function DistributionCard({ matches }: { matches: MatchResult[] }) {
  const counts = LEVELS.map((level) => ({ level, count: matches.filter((m) => m.level === level).length }))
  const max = Math.max(1, ...counts.map((c) => c.count))

  return (
    <CardShell icon={Target} iconColor="var(--color-primary)" iconBg="var(--color-bg-light)" title="Répartition des candidatures">
      {matches.length === 0 ? (
        <p className="text-sm italic" style={{ color: 'var(--color-muted)' }}>Aucune candidature active à répartir.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {counts.map(({ level, count }) => {
            const { fg } = matchLevelColor(level)
            return (
              <div key={level} className="flex items-center gap-2.5">
                <span className="text-xs font-medium w-28 flex-shrink-0" style={{ color: 'var(--color-muted)' }}>{level}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: fg }} />
                </div>
                <span className="text-xs font-bold w-6 text-right" style={{ color: 'var(--color-ink)' }}>{count}</span>
              </div>
            )
          })}
        </div>
      )}
    </CardShell>
  )
}

// ─── Card 5: Recommandations ──────────────────────────────────────────────────

function RecommendationsCard({ goal, matches }: { goal: UserGoal | null; matches: MatchResult[] }) {
  const recs = useMemo(() => buildRecommendations(goal, matches), [goal, matches])

  return (
    <CardShell icon={Lightbulb} iconColor="var(--color-warning)" iconBg="var(--color-status-interview-bg)" title="Recommandations">
      <div className="flex flex-col gap-2.5">
        {recs.map((r) => (
          <div key={r} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink)' }}>{r}</p>
          </div>
        ))}
      </div>
    </CardShell>
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
  const [targetTitle, setTargetTitle] = useState(goal?.target_title ?? '')
  const [roles, setRoles] = useState<string[]>(goal?.target_roles ?? [])
  const [contracts, setContracts] = useState<string[]>(goal?.contract_types ?? [])
  const [locations, setLocations] = useState<string[]>(goal?.locations ?? [])
  const [companies, setCompanies] = useState<string[]>(goal?.target_companies ?? [])
  const [sectors, setSectors] = useState<string[]>(goal?.sectors ?? [])
  const [keywordsWanted, setKeywordsWanted] = useState<string[]>(goal?.keywords_wanted ?? [])
  const [keywordsExcluded, setKeywordsExcluded] = useState<string[]>(goal?.keywords_excluded ?? [])
  const [experienceLevel, setExperienceLevel] = useState<string[]>(goal?.experience_level ?? [])
  const [priorities, setPriorities] = useState(goal?.scoring_priorities ?? '')
  const [timeline, setTimeline] = useState(optionFromTargetDate(goal?.target_date ?? null))
  const [target, setTarget] = useState(goal?.personal_target ?? 10)

  function handleSave() {
    onSave({
      target_title: targetTitle.trim() || null,
      target_roles: roles,
      contract_types: contracts,
      locations,
      target_companies: companies,
      sectors,
      keywords_wanted: keywordsWanted,
      keywords_excluded: keywordsExcluded,
      experience_level: experienceLevel,
      scoring_priorities: priorities.trim() || null,
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
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-status-applied-bg)' }}>
              <Target size={14} style={{ color: 'var(--color-accent)' }} />
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--color-ink)' }}>Modifier mon objectif</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X size={15} style={{ color: 'var(--color-muted)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Intitulé cible</label>
            <input
              className="input w-full text-sm"
              placeholder="Chef de projet innovation / PMO / Graduate Program"
              value={targetTitle}
              onChange={(e) => setTargetTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Postes recherchés</label>
            <TagInput tags={roles} placeholder="Chef de projet, PMO… (Entrée)" onChange={setRoles} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>Délai de recherche</label>
            <div className="grid grid-cols-4 gap-2">
              {TIMELINE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTimeline(opt.value)}
                  className={cn(
                    'flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all',
                    timeline === opt.value ? 'border-sky-600 bg-sky-50' : 'border-[var(--color-border)] hover:border-sky-400',
                  )}
                >
                  <span className="text-xs font-semibold" style={{ color: timeline === opt.value ? 'var(--color-accent)' : 'var(--color-ink)' }}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted)' }}>{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>Types de contrat acceptés</label>
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
                      active ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-[var(--color-border)] hover:border-sky-400',
                    )}
                    style={active ? {} : { color: 'var(--color-muted)' }}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Localisations acceptées</label>
            <TagInput tags={locations} placeholder="Paris, Île-de-France… (Entrée)" onChange={setLocations} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Entreprises cibles</label>
            <TagInput tags={companies} placeholder="Keolis, SNCF… (Entrée)" onChange={setCompanies} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Secteurs recherchés</label>
            <TagInput tags={sectors} placeholder="Transport, innovation… (Entrée)" onChange={setSectors} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-ink)' }}>
              <ThumbsUp size={12} />Mots-clés positifs
            </label>
            <TagInput tags={keywordsWanted} placeholder="Pilotage, coordination… (Entrée)" onChange={setKeywordsWanted} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-ink)' }}>
              <ThumbsDown size={12} />Mots-clés à éviter
            </label>
            <TagInput tags={keywordsExcluded} placeholder="Manutention, opérateur… (Entrée)" onChange={setKeywordsExcluded} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: 'var(--color-ink)' }}>
              <GraduationCap size={12} />Niveau d'expérience recherché
            </label>
            <TagInput tags={experienceLevel} placeholder="Junior, graduate, 0-2 ans… (Entrée)" onChange={setExperienceLevel} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Priorités de scoring (informatif)</label>
            <textarea
              className="input w-full text-sm resize-y"
              rows={2}
              placeholder="Ex : je privilégie le secteur transport et le PMO avant tout."
              value={priorities}
              onChange={(e) => setPriorities(e.target.value)}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-muted)' }}>
              Ce champ est informatif uniquement — il n'affecte pas le calcul du score.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-ink)' }}>Objectif mensuel de candidatures</label>
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
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'var(--color-status-applied-bg)' }}>
        <Target size={36} style={{ color: 'var(--color-accent)' }} />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-ink)' }}>Définissez votre objectif de recherche</h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-muted)' }}>
          Précisez vos critères pour obtenir un score de cohérence fiable sur chacune de vos candidatures.
        </p>
      </div>
      <button onClick={onEdit} className="btn btn-primary flex items-center gap-2">
        <Plus size={15} />
        Créer votre objectif
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
  const { goal, loading, saving, saveGoal } = useGoals(userId)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const matches = useMemo(() => computeMatches(goal, applications), [goal, applications])
  const hasGoal = !!(goal?.target_title || goal?.target_roles.length || goal?.contract_types.length || goal?.locations.length)

  async function handleSave(updates: GoalUpdate) {
    setError(null)
    const err = await saveGoal(updates)
    if (err) { setError(err); return }
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky-600 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Chargement…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>Objectifs</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Définissez votre stratégie et suivez la cohérence de vos candidatures</p>
      </div>

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

      {!hasGoal && !editing ? (
        <EmptyState onEdit={() => setEditing(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="lg:col-span-2">
            <MainObjectiveCard goal={goal} onEdit={() => setEditing(true)} />
          </div>
          <SearchCriteriaCard goal={goal} />
          <div className="flex flex-col gap-5">
            <GlobalCoherenceCard matches={matches} />
            <DistributionCard matches={matches} />
          </div>
          <div className="lg:col-span-2">
            <RecommendationsCard goal={goal} matches={matches} />
          </div>
        </div>
      )}

      {editing && (
        <EditGoalModal goal={goal} saving={saving} onSave={handleSave} onClose={() => setEditing(false)} />
      )}
    </>
  )
}
