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

export function mapGeneratedGoalToDraft(generated: GeneratedGoal): GoalUpdate {
  return {
    target_title: generated.target_title,
    target_roles: generated.target_roles,
    contract_types: generated.contract_types.filter((c) => CONTRACT_OPTIONS.includes(c)),
    locations: generated.locations,
    target_companies: generated.target_companies,
    sectors: generated.sectors,
    keywords_wanted: generated.keywords_wanted,
    keywords_excluded: generated.keywords_excluded,
    experience_level: generated.experience_level,
    scoring_priorities: generated.scoring_priorities,
    target_date: generated.timeline ? targetDateFromOption(generated.timeline) : null,
    personal_target: generated.personal_target,
  }
}
