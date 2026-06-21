import { describe, it, expect } from 'vitest'
import {
  CV_MAX_SIZE_BYTES,
  validateCvFile,
  scoreTone,
  ringOffset,
  computeLibraryStats,
  buildAtsAnalysisUserContent,
  parseAtsAnalysisResponse,
  buildSuggestionsUserContent,
  parseSuggestionsResponse,
} from './cvLibrary'

describe('validateCvFile', () => {
  it('accepts a pdf under the size limit', () => {
    expect(validateCvFile({ name: 'cv.pdf', size: 1000, type: 'application/pdf' })).toBeNull()
  })

  it('accepts a docx by extension when mime type is generic', () => {
    expect(validateCvFile({ name: 'cv.docx', size: 1000, type: 'application/octet-stream' })).toBeNull()
  })

  it('rejects an unsupported format', () => {
    expect(validateCvFile({ name: 'cv.txt', size: 1000, type: 'text/plain' })).toMatch(/non supporté/)
  })

  it('rejects a file over the size limit', () => {
    expect(validateCvFile({ name: 'cv.pdf', size: CV_MAX_SIZE_BYTES + 1, type: 'application/pdf' })).toMatch(/lourd/)
  })
})

describe('scoreTone', () => {
  it('returns success at and above 75', () => {
    expect(scoreTone(75)).toBe('success')
    expect(scoreTone(100)).toBe('success')
  })
  it('returns warning between 50 and 74', () => {
    expect(scoreTone(50)).toBe('warning')
    expect(scoreTone(74)).toBe('warning')
  })
  it('returns danger below 50', () => {
    expect(scoreTone(0)).toBe('danger')
    expect(scoreTone(49)).toBe('danger')
  })
})

describe('ringOffset', () => {
  it('returns 0 offset (full ring) at score 100', () => {
    expect(ringOffset(100, 100)).toBe(0)
  })
  it('returns full circumference (empty ring) at score 0', () => {
    expect(ringOffset(0, 100)).toBe(100)
  })
  it('clamps out-of-range scores', () => {
    expect(ringOffset(150, 100)).toBe(0)
    expect(ringOffset(-20, 100)).toBe(100)
  })
})

describe('computeLibraryStats', () => {
  it('computes counts and average score from real rows', () => {
    const stats = computeLibraryStats(
      [{ ats_score: 80 }, { ats_score: 60 }, { ats_score: null }],
      [
        { score: 70, missing_keywords: ['a', 'b'] },
        { score: 90, missing_keywords: ['c'] },
      ],
    )
    expect(stats).toEqual({ cvCount: 3, analysisCount: 2, avgScore: 80, missingKeywordsCount: 3 })
  })

  it('returns null avgScore with no analyses', () => {
    const stats = computeLibraryStats([], [])
    expect(stats.avgScore).toBeNull()
    expect(stats.cvCount).toBe(0)
  })
})

describe('buildAtsAnalysisUserContent', () => {
  it('includes the cv text and omits job fields when absent', () => {
    const content = buildAtsAnalysisUserContent('mon cv')
    expect(content).toContain('mon cv')
    expect(content).not.toContain('Titre du poste')
  })

  it('includes job title and description when provided', () => {
    const content = buildAtsAnalysisUserContent('mon cv', 'Chef de projet', 'Description du poste')
    expect(content).toContain('Chef de projet')
    expect(content).toContain('Description du poste')
  })
})

describe('parseAtsAnalysisResponse', () => {
  it('parses a well-formed response', () => {
    const result = parseAtsAnalysisResponse({
      score: 78,
      missingKeywords: ['Scrum', 'Scrum', '  Agile  '],
      recommendations: '  Ajoutez des résultats chiffrés.  ',
    })
    expect(result).toEqual({
      score: 78,
      missingKeywords: ['Scrum', 'Agile'],
      recommendations: 'Ajoutez des résultats chiffrés.',
    })
  })

  it('clamps an out-of-range score and defaults missing fields', () => {
    const result = parseAtsAnalysisResponse({ score: 140 })
    expect(result).toEqual({ score: 100, missingKeywords: [], recommendations: '' })
  })

  it('handles a non-object response without throwing', () => {
    expect(parseAtsAnalysisResponse(null)).toEqual({ score: 0, missingKeywords: [], recommendations: '' })
  })
})

describe('buildSuggestionsUserContent', () => {
  it('lists experiences and cv documents', () => {
    const content = buildSuggestionsUserContent(
      [{ title: 'Dev', organization: 'Acme', skills: ['React'] }],
      [{ file_name: 'cv.pdf', ats_score: 72 }],
    )
    expect(content).toContain('Dev chez Acme')
    expect(content).toContain('cv.pdf')
  })

  it('shows fallback text with no data', () => {
    const content = buildSuggestionsUserContent([], [])
    expect(content).toContain('Aucune expérience')
    expect(content).toContain('Aucun CV')
  })
})

describe('parseSuggestionsResponse', () => {
  it('keeps up to 3 non-empty string suggestions', () => {
    const result = parseSuggestionsResponse({ suggestions: ['a', '', '  b  ', 'c', 'd'] })
    expect(result).toEqual(['a', 'b', 'c'])
  })

  it('returns an empty array when suggestions is missing', () => {
    expect(parseSuggestionsResponse({})).toEqual([])
  })
})
