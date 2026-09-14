import { describe, expect, it } from 'vitest'
import { mailtoHref } from './mailto'

describe('mailtoHref', () => {
  it('encode le sujet, accents et symboles compris', () => {
    expect(mailtoHref('contact@creationsdup.fr', 'Code perdu & accès')).toBe(
      'mailto:contact@creationsdup.fr?subject=Code%20perdu%20%26%20acc%C3%A8s',
    )
  })

  it('renvoie l’adresse seule sans sujet', () => {
    expect(mailtoHref('contact@creationsdup.fr')).toBe('mailto:contact@creationsdup.fr')
  })
})
