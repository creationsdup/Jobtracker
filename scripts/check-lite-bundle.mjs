#!/usr/bin/env node
/**
 * check-lite-bundle — refuse un build lite qui contient du code IA ou pdfjs.
 *
 * Usage :
 *   npm run build:lite                          (build lite puis ce contrôle)
 *   node scripts/check-lite-bundle.mjs [dossier] (défaut : dist)
 *
 * Voir docs/superpowers/specs/2026-09-13-lite-edition-design.md §5.
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const FORBIDDEN_CONTENT = ['api.openai.com', 'sk-proj-', 'ai-assistant', 'pdf.worker']

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

export function scanDist(distDir) {
  if (!existsSync(distDir)) {
    return [{ file: distDir, reason: 'dossier introuvable (lancer le build avant le contrôle)' }]
  }

  const violations = []
  for (const path of listFiles(distDir)) {
    const file = relative(distDir, path)
    const name = basename(path)
    if (name.includes('pdf.worker')) violations.push({ file, reason: 'nom contient "pdf.worker"' })
    if (name.startsWith('vendor-pdf')) violations.push({ file, reason: 'nom commence par "vendor-pdf"' })
    // WHY: latin1 lit n'importe quel octet sans erreur (images, polices) ; les motifs sont en ASCII.
    const content = readFileSync(path, 'latin1')
    for (const pattern of FORBIDDEN_CONTENT) {
      if (content.includes(pattern)) violations.push({ file, reason: `contient "${pattern}"` })
    }
  }
  return violations
}

// WHY: process.argv[1] n'est pas résolu à travers les symlinks par Node ; comparer les chemins
// réels (realpathSync) évite qu'un appel via un lien symbolique fasse échouer silencieusement
// cette détection et sorte en exit 0 sans avoir scanné dist/.
const isMain = process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const distDir = resolve(process.argv[2] ?? 'dist')
  const violations = scanDist(distDir)
  if (violations.length > 0) {
    console.error(`✗ Build lite refusé — ${violations.length} problème(s) dans ${distDir} :`)
    for (const { file, reason } of violations) console.error(`  - ${file} : ${reason}`)
    process.exit(1)
  }
  console.log(`✓ Build lite propre : aucune trace de l'IA ni de pdfjs dans ${distDir}`)
}
