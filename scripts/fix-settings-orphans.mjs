// fix-settings-orphans.mjs — clean up orphaned `</svg></button>} />`
// junk left behind by the over-eager strip script. Replace the orphan
// block + the immediate <div className="px-X py-Y ..."> wrapper with
// a clean <> opening + <div className="space-y-4">.

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

  // Find: <>\n      </svg>\n        </button>\n      } />\n\n      <div className="...">
  // Replace with: <>\n      <div className="space-y-4">
  src = src.replace(
    /<>\s*<\/svg>\s*<\/button>\s*\}\s*\/>\s*<div className="[^"]*">/m,
    '<>\n      <div className="space-y-4">',
  )

  if (src !== before) {
    writeFileSync(f, src, 'utf8')
    changed++
    console.log(`  ✓ ${f}`)
  } else {
    console.log(`  · ${f} (no orphan found)`)
  }
}
console.log(`\nFixed ${changed} files.`)
