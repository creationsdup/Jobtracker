interface EmptyDropZoneProps {
  label?: string
}

export function EmptyDropZone({ label = 'Glissez une carte ici' }: EmptyDropZoneProps) {
  return (
    <div
      className="rounded-[14px] h-20 flex items-center justify-center"
      style={{ border: '1.5px dashed var(--color-border-hover)', background: 'rgba(255,255,255,0.5)' }}
    >
      <p className="text-[11px]" style={{ color: 'var(--color-subtle)' }}>{label}</p>
    </div>
  )
}
