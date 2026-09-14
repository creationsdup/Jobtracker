import { describe, it, expect, vi } from 'vitest'
import {
  companiesToLookUp,
  createCompanyDomainFinder,
  parseSuggestions,
  pickCompanyDomain,
  type SuggestFetch,
} from './companyLookup'

describe('pickCompanyDomain', () => {
  it('garde la suggestion dont le nom est identique à la saisie', () => {
    const suggestions = [
      { name: 'SNCF', domain: 'sncf.com' },
      { name: 'SNCFT', domain: 'sncft.com.tn' },
    ]
    expect(pickCompanyDomain('sncf', suggestions)).toBe('sncf.com')
  })

  it('ignore casse, accents, apostrophes et suffixes juridiques', () => {
    expect(pickCompanyDomain('Thales', [
      { name: 'Thales Group', domain: 'thalesgroup.com' },
      { name: 'Thales', domain: 'thalescorp.pe' },
    ])).toBe('thalesgroup.com')
    expect(pickCompanyDomain("L'Oréal", [
      { name: "L'Oréal Paris", domain: 'lorealparisusa.com' },
      { name: "L'Oréal", domain: 'loreal.com' },
    ])).toBe('loreal.com')
  })

  it('refuse un nom seulement proche, plutôt que d’afficher un faux logo', () => {
    expect(pickCompanyDomain('Free', [
      { name: 'FreeOnes', domain: 'freeones.com' },
      { name: 'Free Press', domain: 'freep.com' },
    ])).toBeNull()
    expect(pickCompanyDomain('Orange', [{ name: 'Orange County Register', domain: 'ocregister.com' }])).toBeNull()
    expect(pickCompanyDomain('Mistral AI', [{ name: 'Mistral Air S.r.l.', domain: 'mistralair.it' }])).toBeNull()
  })

  it('écarte un domaine mal formé', () => {
    expect(pickCompanyDomain('Acme', [
      { name: 'Acme', domain: 'acme.com/carrieres' },
      { name: 'Acme', domain: 'pas un domaine' },
      { name: 'Acme', domain: 'acme.fr' },
    ])).toBe('acme.fr')
  })

  it('renvoie null pour une saisie vide', () => {
    expect(pickCompanyDomain('  ', [{ name: '', domain: 'vide.com' }])).toBeNull()
  })
})

describe('parseSuggestions', () => {
  it('ne garde que les éléments avec un nom et un domaine texte', () => {
    expect(parseSuggestions([
      { name: 'SNCF', domain: 'sncf.com', logo: null },
      { name: 'Sans domaine' },
      { domain: 'sans-nom.com' },
      null,
      'texte',
    ])).toEqual([{ name: 'SNCF', domain: 'sncf.com' }])
  })

  it('renvoie une liste vide si la réponse n’est pas un tableau', () => {
    expect(parseSuggestions({ error: 'quota' })).toEqual([])
  })
})

function jsonResponse(body: unknown, ok = true): Awaited<ReturnType<SuggestFetch>> {
  return { ok, json: async () => body }
}

describe('createCompanyDomainFinder', () => {
  it('interroge Clearbit avec le nom saisi et renvoie le domaine retenu', async () => {
    const fetchFn = vi.fn<SuggestFetch>(async () => jsonResponse([{ name: 'Crédit Agricole', domain: 'credit-agricole.fr' }]))
    const find = createCompanyDomainFinder(fetchFn)

    await expect(find('Crédit Agricole')).resolves.toBe('credit-agricole.fr')
    const [url, init] = fetchFn.mock.calls[0]
    expect(url.startsWith('https://autocomplete.clearbit.com/v1/companies/suggest?')).toBe(true)
    expect(new URL(url).searchParams.get('query')).toBe('Crédit Agricole')
    expect(init.signal).toBeDefined()
  })

  it('ne refait pas la recherche pour la même entreprise, même écrite autrement', async () => {
    const fetchFn = vi.fn<SuggestFetch>(async () => jsonResponse([{ name: 'Decathlon', domain: 'decathlon.com' }]))
    const find = createCompanyDomainFinder(fetchFn)

    const [first, second] = await Promise.all([find('Décathlon SAS'), find('decathlon')])
    await find('DECATHLON')

    expect([first, second]).toEqual(['decathlon.com', 'decathlon.com'])
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('garde en mémoire une réponse sans correspondance', async () => {
    const fetchFn = vi.fn<SuggestFetch>(async () => jsonResponse([{ name: 'FreeOnes', domain: 'freeones.com' }]))
    const find = createCompanyDomainFinder(fetchFn)

    await expect(find('Free')).resolves.toBeNull()
    await find('Free')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('renvoie null sans retenir l’échec quand le service répond en erreur ou est injoignable', async () => {
    const fetchFn = vi.fn<SuggestFetch>()
      .mockResolvedValueOnce(jsonResponse(null, false))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse([{ name: 'Qonto', domain: 'qonto.com' }]))
    const find = createCompanyDomainFinder(fetchFn)

    await expect(find('Qonto')).resolves.toBeNull()
    await expect(find('Qonto')).resolves.toBeNull()
    await expect(find('Qonto')).resolves.toBe('qonto.com')
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })

  it('n’appelle pas le service pour une saisie vide', async () => {
    const fetchFn = vi.fn<SuggestFetch>()
    const find = createCompanyDomainFinder(fetchFn)

    await expect(find('   ')).resolves.toBeNull()
    expect(fetchFn).not.toHaveBeenCalled()
  })
})

describe('companiesToLookUp', () => {
  it('garde une seule fois chaque entreprise sans logo connu ni recherche déjà lancée', () => {
    const known = new Set(['Airbus'])
    const queued = new Set(['doctolib'])

    expect(companiesToLookUp(
      ['SNCF', 'Airbus', 'sncf', 'Doctolib', '  ', 'Qonto SAS', 'qonto'],
      (company) => known.has(company),
      queued,
    )).toEqual(['SNCF', 'Qonto SAS'])
  })
})
