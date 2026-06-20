import type { GeneratedGoal } from './ai'
import type { GoalUpdate } from '@/hooks/useGoals'

export const CONTRACT_OPTIONS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance', 'Mission']

export function targetDateFromOption(opt: string): string {
  const now = new Date()
  const months = ({ '1m': 1, '3m': 3, '6m': 6, '12m': 12 } as Record<string, number>)[opt] ?? 3
  now.setMonth(now.getMonth() + months)
  return now.toISOString().slice(0, 10)
}

export function optionFromTargetDate(date: string | null): string {
  if (!date) return ''
  const diff = Math.round((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
  if (diff <= 1) return '1m'
  if (diff <= 3) return '3m'
  if (diff <= 6) return '6m'
  return '12m'
}

// WHY: generateGoalFromText does an unchecked `JSON.parse(...) as GeneratedGoal` cast — a
// malformed-but-parseable AI response (missing key, wrong type) must still map to a safe
// draft ([]/null) instead of throwing, per the spec's "omitted field -> []/null" guarantee.
function toArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

const TIMELINE_OPTIONS = ['1m', '3m', '6m', '12m'] as const
type TimelineOption = (typeof TIMELINE_OPTIONS)[number]

function isTimelineOption(value: unknown): value is TimelineOption {
  return TIMELINE_OPTIONS.includes(value as TimelineOption)
}

export function mapGeneratedGoalToDraft(generated: GeneratedGoal): GoalUpdate {
  return {
    target_title: typeof generated.target_title === 'string' ? generated.target_title : null,
    target_roles: toArray(generated.target_roles),
    contract_types: toArray(generated.contract_types).filter((c) => CONTRACT_OPTIONS.includes(c)),
    locations: toArray(generated.locations),
    target_companies: toArray(generated.target_companies),
    sectors: toArray(generated.sectors),
    keywords_wanted: toArray(generated.keywords_wanted),
    keywords_excluded: toArray(generated.keywords_excluded),
    experience_level: toArray(generated.experience_level),
    scoring_priorities: typeof generated.scoring_priorities === 'string' ? generated.scoring_priorities : null,
    target_date: isTimelineOption(generated.timeline) ? targetDateFromOption(generated.timeline) : null,
    personal_target: typeof generated.personal_target === 'number' ? generated.personal_target : null,
  }
}
