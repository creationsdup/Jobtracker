import { useEffect, useRef, useState } from 'react'
import type { ResolvedResumeData } from '@/types/cvBuilder'
import { TemplateClassic } from './TemplateClassic'
import { TemplateModern } from './TemplateModern'
import { TemplateMinimal } from './TemplateMinimal'
import { TemplateCreative } from './TemplateCreative'
import { TemplateEngine } from '../engine/TemplateEngine'
import { getTemplateConfig, LEGACY_TEMPLATES } from '../engine/templateRegistry'

interface Props {
  data: ResolvedResumeData
}

const CV_WIDTH = 794 // A4 at 96 dpi

export function CVPreview({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return
      const available = containerRef.current.clientWidth - 24
      setScale(Math.min(1, available / CV_WIDTH))
    }
    updateScale()
    const ro = new ResizeObserver(updateScale)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const scaledHeight = 1123 * scale // approx A4 height at 96dpi × scale

  function renderTemplate() {
    const tpl = data.customization.template

    if (LEGACY_TEMPLATES.has(tpl)) {
      const LegacyMap = {
        classic: TemplateClassic,
        modern: TemplateModern,
        minimal: TemplateMinimal,
        creative: TemplateCreative,
      } as Record<string, React.ComponentType<{ data: ResolvedResumeData }>>
      const Template = LegacyMap[tpl]
      if (Template) return <Template data={data} />
    }

    const config = getTemplateConfig(tpl)
    return <TemplateEngine data={data} config={config} />
  }

  return (
    <div ref={containerRef} className="w-full overflow-y-auto px-3 pt-3 pb-3">
      <div
        style={{
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          width: CV_WIDTH,
          height: scaledHeight / scale,
          marginBottom: -(scaledHeight / scale) * (1 - scale),
        }}
        id="cv-print-target"
      >
        {renderTemplate()}
      </div>
    </div>
  )
}
