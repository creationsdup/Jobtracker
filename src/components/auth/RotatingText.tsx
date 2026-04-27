import { useState, useEffect } from 'react'
import styles from './RotatingText.module.css'

const messages = [
  {
    title: "Suis ta recherche d'emploi",
    sub: 'Candidatures, entretiens et relances au même endroit.',
  },
  {
    title: 'Ne rate plus jamais une relance',
    sub: 'Des rappels automatiques pour chaque étape clé.',
  },
  {
    title: 'Prépare tes entretiens',
    sub: 'Missions, questions clés et notes centralisées.',
  },
  {
    title: 'Ton CV, toujours prêt',
    sub: 'Adapte et exporte ton CV en quelques secondes.',
  },
  {
    title: 'Importe une offre en 1 clic',
    sub: 'Colle un lien LinkedIn ou WTTJ, on fait le reste.',
  },
]

export function RotatingText() {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % messages.length)
        setVisible(true)
      }, 400)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.textBlock} ${visible ? styles.visible : styles.hidden}`}>
        <p className={styles.title}>{messages[current].title}</p>
        <p className={styles.sub}>{messages[current].sub}</p>
      </div>
      <div className={styles.dots}>
        {messages.map((_, i) => (
          <div
            key={i}
            className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
          />
        ))}
      </div>
    </div>
  )
}
