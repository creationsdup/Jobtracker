import type { Application, ApplicationStatus } from '@/lib/types'

const STATUS_CANDIDATES: Record<ApplicationStatus, string[]> = {
  WISHLIST: ['WISHLIST', 'wishlist', 'saved', 'SAVED'],
  APPLIED: ['APPLIED', 'applied'],
  PHONE_SCREEN: ['PHONE_SCREEN', 'phone_screen', 'APPLIED', 'applied'],
  INTERVIEW: ['INTERVIEW', 'interview'],
  TECHNICAL_TEST: ['TECHNICAL_TEST', 'technical_test', 'INTERVIEW', 'interview'],
  OFFER: ['OFFER', 'offer'],
  ACCEPTED: ['ACCEPTED', 'accepted', 'OFFER', 'offer'],
  REJECTED: ['REJECTED', 'rejected'],
  WITHDRAWN: ['WITHDRAWN', 'withdrawn', 'REJECTED', 'rejected'],
}

const RAW_TO_UI_STATUS: Record<string, ApplicationStatus> = {
  WISHLIST: 'WISHLIST',
  wishlist: 'WISHLIST',
  saved: 'WISHLIST',
  SAVED: 'WISHLIST',
  APPLIED: 'APPLIED',
  applied: 'APPLIED',
  PHONE_SCREEN: 'PHONE_SCREEN',
  phone_screen: 'PHONE_SCREEN',
  INTERVIEW: 'INTERVIEW',
  interview: 'INTERVIEW',
  TECHNICAL_TEST: 'TECHNICAL_TEST',
  technical_test: 'TECHNICAL_TEST',
  OFFER: 'OFFER',
  offer: 'OFFER',
  ACCEPTED: 'ACCEPTED',
  accepted: 'ACCEPTED',
  REJECTED: 'REJECTED',
  rejected: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
  withdrawn: 'WITHDRAWN',
}

export function getDbStatusCandidates(status: ApplicationStatus): string[] {
  return STATUS_CANDIDATES[status]
}

export function toUiApplicationStatus(status: string): ApplicationStatus {
  return RAW_TO_UI_STATUS[status] ?? 'WISHLIST'
}

export function normalizeApplicationFromDb(app: Application): Application {
  return {
    ...app,
    status: toUiApplicationStatus(String(app.status)),
  }
}

export function isEnumStatusError(message: string | undefined): boolean {
  return !!message && /invalid input value for enum "ApplicationStatus"/i.test(message)
}
