import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { scanDist } from './check-lite-bundle.mjs'

let dir

function makeDist(files) {
  dir = mkdtempSync(join(tmpdir(), 'lite-bundle-'))
  for (const [name, content] of Object.entries(files)) {
    const path = join(dir, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
  return dir
}

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

describe('scanDist', () => {
  it('accepte un build sans motif interdit', () => {
    const dist = makeDist({ 'index.html': '<div id="root"></div>', 'assets/index-abc.js': 'console.log("ok")' })
    expect(scanDist(dist)).toEqual([])
  })

  it('signale chaque motif interdit trouvé dans un fichier', () => {
    const dist = makeDist({ 'assets/index-abc.js': 'fetch("https://api.openai.com/v1");invoke("ai-assistant")' })
    expect(scanDist(dist)).toEqual([
      { file: join('assets', 'index-abc.js'), reason: 'contient "api.openai.com"' },
      { file: join('assets', 'index-abc.js'), reason: 'contient "ai-assistant"' },
    ])
  })

  it('signale une clé OpenAI inlinée', () => {
    const dist = makeDist({ 'assets/a.js': 'const k="sk-proj-XXXX"' })
    expect(scanDist(dist).map((v) => v.reason)).toEqual(['contient "sk-proj-"'])
  })

  it('signale les fichiers pdfjs par leur nom', () => {
    const dist = makeDist({ 'assets/pdf.worker.min-123.mjs': '', 'assets/vendor-pdf-456.js': '' })
    expect(scanDist(dist).map((v) => v.reason).sort()).toEqual([
      'nom commence par "vendor-pdf"',
      'nom contient "pdf.worker"',
    ])
  })

  it("échoue si le dossier n'existe pas", () => {
    const violations = scanDist(join(tmpdir(), 'lite-bundle-dossier-inexistant'))
    expect(violations).toHaveLength(1)
    expect(violations[0].reason).toContain('introuvable')
  })
})
