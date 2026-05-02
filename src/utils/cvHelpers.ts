export function formatCVDate(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month] = dateStr.split('-')
  if (!year) return ''
  if (!month) return year
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  return `${months[parseInt(month, 10) - 1]} ${year}`
}

export function skillLevelLabel(level: string): string {
  const map: Record<string, string> = {
    beginner: 'Débutant',
    intermediate: 'Intermédiaire',
    advanced: 'Avancé',
    expert: 'Expert',
  }
  return map[level] ?? level
}

export function skillLevelDots(level: string): string {
  const map: Record<string, string> = {
    beginner: '●○○○',
    intermediate: '●●○○',
    advanced: '●●●○',
    expert: '●●●●',
  }
  return map[level] ?? '●●○○'
}
