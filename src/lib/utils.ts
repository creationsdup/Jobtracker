import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return ''
  // Date-only strings (YYYY-MM-DD) are parsed as UTC by the Date constructor,
  // which causes a 1-day offset in timezones ahead of UTC. Force local time.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(dateStr + 'T00:00:00')
    : new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function getInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}
