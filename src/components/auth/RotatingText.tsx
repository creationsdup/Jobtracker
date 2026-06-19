import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n/I18nContext'
import type { TranslationKey } from '@/lib/i18n/translations'
import styles from './RotatingText.module.css'

const messageKeys: { title: TranslationKey; sub: TranslationKey }[] = [
  { title: 'rotating.title1', sub: 'rotating.sub1' },
  { title: 'rotating.title2', sub: 'rotating.sub2' },
  { title: 'rotating.title3', sub: 'rotating.sub3' },
  { title: 'rotating.title4', sub: 'rotating.sub4' },
  { title: 'rotating.title5', sub: 'rotating.sub5' },
]

export function RotatingText() {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % messageKeys.length)
        setVisible(true)
      }, 400)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.textBlock} ${visible ? styles.visible : styles.hidden}`}>
        <p className={styles.title}>{t(messageKeys[current].title)}</p>
        <p className={styles.sub}>{t(messageKeys[current].sub)}</p>
      </div>
      <div className={styles.dots}>
        {messageKeys.map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
          />
        ))}
      </div>
    </div>
  )
}
