import { useState } from 'react'
import { X } from 'lucide-react'
import type { TemplateType } from '@/types/cvBuilder'
import { ALL_TEMPLATES, type TemplateConfig } from './templateRegistry'

interface Props {
  current: TemplateType
  onSelect: (id: TemplateType) => void
  onClose: () => void
}

type CategoryLabel = 'Tous' | 'Professionnel' | 'Créatif' | 'Minimal' | 'Tech' | 'Académique'

const CATEGORIES: { label: CategoryLabel; value: TemplateConfig['category'] | 'all' }[] = [
  { label: 'Tous', value: 'all' },
  { label: 'Professionnel', value: 'professional' },
  { label: 'Créatif', value: 'creative' },
  { label: 'Minimal', value: 'minimal' },
  { label: 'Tech', value: 'tech' },
  { label: 'Académique', value: 'academic' },
]

/** Tiny SVG thumbnail illustrating the layout visually */
function LayoutThumb({ config, color, selected }: { config: TemplateConfig; color: string; selected: boolean }) {
  const fill = selected ? color : '#e5e7eb'
  const accent = selected ? color : '#9ca3af'
  const bg = config.darkBg ? '#1e293b' : '#ffffff'
  const sideFill = selected ? color : '#d1d5db'

  const W = 96
  const H = 128

  if (config.layout === 'sidebar-left') {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} rx={4} fill={bg} stroke={selected ? color : '#e5e7eb'} strokeWidth={selected ? 1.5 : 1} />
        {/* Sidebar */}
        <rect x={0} y={0} width={26} height={H} rx={4} fill={sideFill} opacity={0.9} />
        {/* Header bar in main */}
        <rect x={32} y={10} width={58} height={6} rx={2} fill={accent} opacity={0.6} />
        <rect x={32} y={20} width={40} height={3} rx={1} fill="#d1d5db" />
        {/* Content lines */}
        {[30, 38, 46, 60, 68, 76, 90, 98].map(y => (
          <rect key={y} x={32} y={y} width={y % 16 === 0 ? 50 : 42} height={2} rx={1} fill="#e5e7eb" />
        ))}
        {/* Sidebar items */}
        {[12, 30, 48, 70, 88].map(y => (
          <rect key={y} x={4} y={y} width={16} height={2} rx={1} fill="rgba(255,255,255,0.45)" />
        ))}
      </svg>
    )
  }

  if (config.layout === 'sidebar-right') {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} rx={4} fill={bg} stroke={selected ? color : '#e5e7eb'} strokeWidth={selected ? 1.5 : 1} />
        <rect x={70} y={0} width={26} height={H} rx={4} fill={sideFill} opacity={0.9} />
        <rect x={6} y={10} width={58} height={6} rx={2} fill={accent} opacity={0.6} />
        <rect x={6} y={20} width={40} height={3} rx={1} fill="#d1d5db" />
        {[30, 38, 46, 60, 68, 76, 90, 98].map(y => (
          <rect key={y} x={6} y={y} width={y % 16 === 0 ? 50 : 42} height={2} rx={1} fill="#e5e7eb" />
        ))}
        {[12, 30, 48, 70, 88].map(y => (
          <rect key={y} x={74} y={y} width={16} height={2} rx={1} fill="rgba(255,255,255,0.45)" />
        ))}
      </svg>
    )
  }

  if (config.layout === 'two-col') {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
        <rect width={W} height={H} rx={4} fill={bg} stroke={selected ? color : '#e5e7eb'} strokeWidth={selected ? 1.5 : 1} />
        {/* Full-width header */}
        <rect x={6} y={8} width={84} height={14} rx={3} fill={fill} opacity={0.35} />
        <rect x={6} y={8} width={84} height={14} rx={3} fill="none" stroke={accent} strokeWidth={0.5} />
        {/* Divider */}
        <line x1={50} y1={28} x2={50} y2={H - 6} stroke="#e5e7eb" strokeWidth={1} />
        {/* Left col */}
        {[32, 42, 52, 64, 74, 84, 96, 106].map(y => (
          <rect key={y} x={6} y={y} width={y % 20 === 0 ? 36 : 28} height={2} rx={1} fill="#e5e7eb" />
        ))}
        {/* Right col */}
        {[32, 42, 52, 64, 74, 84, 96, 106].map(y => (
          <rect key={y + 200} x={54} y={y} width={y % 20 === 0 ? 32 : 24} height={2} rx={1} fill="#e5e7eb" />
        ))}
      </svg>
    )
  }

  // single — default (including photo variants)
  const hasBand = config.headerStyle === 'band' || config.headerStyle === 'gradient-band' || config.headerStyle === 'photo-band'
  const photoLeft = config.headerStyle === 'photo-left'
  const photoRight = config.headerStyle === 'photo-right'
  const photoCentered = config.headerStyle === 'photo-centered'
  const photoCircleR = 10
  const bodyStart = hasBand ? 32 : (photoCentered ? 46 : 38)

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} rx={4} fill={bg} stroke={selected ? color : '#e5e7eb'} strokeWidth={selected ? 1.5 : 1} />

      {/* Band header */}
      {hasBand && <rect x={0} y={0} width={W} height={26} rx={4} fill={fill} opacity={0.85} />}
      {hasBand && (
        <circle cx={W - 18} cy={13} r={9} fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.4)" strokeWidth={0.8} />
      )}

      {/* Photo-left header */}
      {photoLeft && (
        <>
          <circle cx={8 + photoCircleR} cy={15} r={photoCircleR} fill={fill} opacity={0.7} />
          <rect x={28} y={10} width={52} height={5} rx={2} fill={accent} opacity={0.55} />
          <rect x={28} y={18} width={36} height={2.5} rx={1} fill="#d1d5db" />
          <line x1={8} y1={30} x2={88} y2={30} stroke="#e5e7eb" strokeWidth={0.8} />
        </>
      )}

      {/* Photo-right header */}
      {photoRight && (
        <>
          <rect x={8} y={9} width={52} height={6} rx={2} fill={accent} opacity={0.55} />
          <rect x={8} y={18} width={36} height={2.5} rx={1} fill="#d1d5db" />
          <rect x={8} y={23} width={26} height={2} rx={1} fill="#e5e7eb" />
          <rect x={W - 8 - photoCircleR * 2} y={8} width={photoCircleR * 2} height={photoCircleR * 2} rx={3} fill={fill} opacity={0.7} />
          <line x1={8} y1={32} x2={88} y2={32} stroke="#e5e7eb" strokeWidth={0.8} />
        </>
      )}

      {/* Photo-centered header */}
      {photoCentered && (
        <>
          <circle cx={W / 2} cy={12} r={photoCircleR} fill={fill} opacity={0.7} />
          <rect x={22} y={26} width={52} height={5} rx={2} fill={accent} opacity={0.55} />
          <rect x={28} y={34} width={40} height={2.5} rx={1} fill="#d1d5db" />
          <line x1={8} y1={42} x2={88} y2={42} stroke="#e5e7eb" strokeWidth={0.8} />
        </>
      )}

      {/* Standard header (non-photo, non-band) */}
      {!hasBand && !photoLeft && !photoRight && !photoCentered && (
        <>
          <rect x={8} y={10} width={60} height={8} rx={2} fill={accent} opacity={0.5} />
          <rect x={8} y={22} width={40} height={3} rx={1} fill="#d1d5db" />
          <line x1={8} y1={30} x2={88} y2={30} stroke="#e5e7eb" strokeWidth={1} />
        </>
      )}

      {/* Content lines */}
      {[bodyStart, bodyStart + 8, bodyStart + 18, bodyStart + 28, bodyStart + 38, bodyStart + 48, bodyStart + 60, bodyStart + 70].map((y, i) => (
        y < H - 4 ? <rect key={i} x={8} y={y} width={i % 3 === 0 ? 72 : i % 3 === 1 ? 56 : 64} height={2} rx={1} fill="#e5e7eb" /> : null
      ))}
    </svg>
  )
}

export function TemplateGallery({ current, onSelect, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState<TemplateConfig['category'] | 'all'>('all')

  const filtered = activeCategory === 'all'
    ? ALL_TEMPLATES
    : ALL_TEMPLATES.filter(t => t.category === activeCategory)

  const ACCENT = '#3b82f6'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 780, maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Choisir un template</h2>
            <p className="text-xs text-gray-400 mt-0.5">37 templates disponibles — cliquez pour sélectionner</p>
          </div>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-0 shrink-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeCategory === cat.value
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              style={activeCategory === cat.value ? { background: ACCENT } : {}}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-5 gap-4">
            {filtered.map(config => {
              const isSelected = current === config.id
              return (
                <button
                  key={config.id}
                  onClick={() => { onSelect(config.id); onClose() }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60 shadow-md'
                      : 'border-gray-100 hover:border-gray-300 bg-white'
                  }`}
                >
                  <LayoutThumb config={config} color={ACCENT} selected={isSelected} />
                  <div className="text-center">
                    <p className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-blue-600' : 'text-gray-800'}`}>
                      {config.label}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-0.5 capitalize">{config.category}</p>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
