import { useMemo } from 'react'
import type { Application } from '@/lib/types'

export interface DashboardStats {
  wishlist: number
  applied: number
  interview: number
  offer: number
  rejected: number
  total: number
}

export function useDashboardStats(applications: Application[]): DashboardStats {
  return useMemo(() => ({
    wishlist:  applications.filter((a) => a.status === 'WISHLIST').length,
    applied:   applications.filter((a) => a.status === 'APPLIED' || a.status === 'PHONE_SCREEN').length,
    interview: applications.filter((a) => a.status === 'INTERVIEW' || a.status === 'TECHNICAL_TEST').length,
    offer:     applications.filter((a) => a.status === 'OFFER' || a.status === 'ACCEPTED').length,
    rejected:  applications.filter((a) => a.status === 'REJECTED' || a.status === 'WITHDRAWN').length,
    total:     applications.length,
  }), [applications])
}
