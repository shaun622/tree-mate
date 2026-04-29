// strip-settings-chrome.mjs — converts settings sub-pages from
// full pages into pane-only render trees by removing PageWrapper +
// Header and the now-unused imports.

import { readFileSync, writeFileSync } from 'node:fs'

const FILES = [
  'src/pages/settings/Automations.jsx',
  'src/pages/settings/CommunicationTemplates.jsx',
  'src/pages/settings/EquipmentLibrary.jsx',
  'src/pages/settings/ImportData.jsx',
  'src/pages/settings/Integrations.jsx',
  'src/pages/settings/JobTypeTemplates.jsx',
  'src/pages/settings/SurveyResults.jsx',
]

let changed = 0
for (const f of FILES) {
  let src = readFileSync(f, 'utf8')
  const before = src

  // 1. Remove the PageWrapper + Header opening block.
  //    Pattern: <PageWrapper ...> followed (possibly after newlines) by
  //    a <Header ... /> (single-line) OR <Header ...>...</Header>.
  src = src.replace(
    /<PageWrapper[^>]*>\s*<Header[\s\S]*?\/>\s*/m,
    '<>\n      ',
  )
  // Some pages have Header with right-action JSX that needs balancing.
  src = src.replace(
    /<PageWrapper[^>]*>\s*<Header[\s\S]*?<\/Header>\s*/m,
    '<>\n      ',
  )

  // 2. Closing </PageWrapper> → </>
  src = src.replace(/<\/PageWrapper>/g, '</>')

  // 3. Remove now-unused imports
  src = src.replace(/^import PageWrapper.*\n/m, '')
  src = src.replace(/^import Header.*\n/m, '')

  if (src !== before) {
    writeFileSync(f, src, 'utf8')
    changed++
    console.log(`  ✓ ${f}`)
  } else {
    console.log(`  · ${f} (no change)`)
  }
}
console.log(`\nStripped ${changed} settings sub-pages.`)
