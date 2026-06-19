const LEGAL_SUFFIXES = [
  'sas', 'sasu', 'sarl', 'sa', 'eurl', 'sci',
  'inc', 'llc', 'ltd', 'plc', 'gmbh', 'ag', 'nv', 'bv', 'srl', 'spa',
  'corp', 'corporation', 'co', 'company', 'group', 'holding', 'holdings',
]

const DIACRITICS_REGEX = new RegExp('[\\u0300-\\u036f]', 'g')
const SUFFIX_REGEX = new RegExp(`\\b(${LEGAL_SUFFIXES.join('|')})\\b`, 'g')

// Normalise un nom d'entreprise pour le faire correspondre malgré les variations
// (casse, accents, suffixes juridiques) : "Décathlon SAS" et "decathlon" -> "decathlon".
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(SUFFIX_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
