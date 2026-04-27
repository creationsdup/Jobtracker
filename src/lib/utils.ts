import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', {
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
