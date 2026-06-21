import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { CV_STATUS_LABELS, type CvDocument, type Experience } from '@/lib/types'

interface CompareCvModalProps {
  cvDocuments: CvDocument[]
  experiences: Experience[]
  onClose: () => void
}

function cvMetrics(cv: CvDocument | undefined, experiences: Experience[]) {
  if (!cv) return null
  const linked = experiences.filter((exp) => exp.sourceCvId === cv.id)
  const skillsCount = new Set(linked.flatMap((exp) => exp.skills)).size
  return {
    score: cv.ats_score,
    status: CV_STATUS_LABELS[cv.status],
    importedAt: formatDate(cv.created_at),
    experienceCount: linked.length,
    skillsCount,
  }
}

export function CompareCvModal({ cvDocuments, experiences, onClose }: CompareCvModalProps) {
  const [idA, setIdA] = useState(cvDocuments[0]?.id ?? '')
  const [idB, setIdB] = useState(cvDocuments[1]?.id ?? cvDocuments[0]?.id ?? '')

  const cvA = cvDocuments.find((cv) => cv.id === idA)
  const cvB = cvDocuments.find((cv) => cv.id === idB)
  const metricsA = useMemo(() => cvMetrics(cvA, experiences), [cvA, experiences])
  const metricsB = useMemo(() => cvMetrics(cvB, experiences), [cvB, experiences])

  const rows: Array<{ label: string; a: string; b: string }> = metricsA && metricsB ? [
    { label: 'Score ATS', a: metricsA.score !== null ? `${metricsA.score}%` : '—', b: metricsB.score !== null ? `${metricsB.score}%` : '—' },
    { label: 'Statut', a: metricsA.status, b: metricsB.status },
    { label: "Date d'import", a: metricsA.importedAt, b: metricsB.importedAt },
    { label: 'Expériences liées', a: String(metricsA.experienceCount), b: String(metricsB.experienceCount) },
    { label: 'Compétences détectées', a: String(metricsA.skillsCount), b: String(metricsB.skillsCount) },
  ] : []

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-sm">Comparer deux CV</h2>
          <button className="btn btn-ghost p-1" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {cvDocuments.length < 2 ? (
            <p className="text-sm text-[var(--color-muted)]">Importez au moins deux CV pour pouvoir les comparer.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <select className="input" value={idA} onChange={(e) => setIdA(e.target.value)}>
                  {cvDocuments.map((cv) => <option key={cv.id} value={cv.id}>{cv.file_name}</option>)}
                </select>
                <select className="input" value={idB} onChange={(e) => setIdB(e.target.value)}>
                  {cvDocuments.map((cv) => <option key={cv.id} value={cv.id}>{cv.file_name}</option>)}
                </select>
              </div>

              <table className="w-full text-sm">
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="py-2 text-[var(--color-muted)] text-xs font-semibold uppercase">{row.label}</td>
                      <td className="py-2 text-center">{row.a}</td>
                      <td className="py-2 text-center">{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
