import { X } from 'lucide-react'
import type { MatchResult } from '@/types/jobMatching'
import { MatchDetailsContent } from './MatchDetailsContent'

interface MatchDetailsModalProps {
  result: MatchResult
  onClose: () => void
}

export function MatchDetailsModal({ result, onClose }: MatchDetailsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl shadow-2xl p-6" style={{ background: 'var(--color-surface)' }}>
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X size={15} style={{ color: 'var(--color-muted)' }} />
          </button>
        </div>
        <MatchDetailsContent result={result} />
      </div>
    </div>
  )
}
