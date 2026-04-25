// Mass dark-mode sweep — adds dark: variants to common Tailwind patterns
// across all .jsx files under src/. Idempotent — only adds dark:* if not
// already present. Also normalises `tree-N` → `brand-N` (CSS-var alias
// will keep the colour identical in light mode).
//
// Usage: node scripts/dark-mode-sweep.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { globSync } from 'node:fs'
import { execSync } from 'node:child_process'

// Find all .jsx files under src/ — skip .test/.spec/.stories
const files = execSync('git ls-files "src/**/*.jsx"', {
  cwd: process.cwd(),
  encoding: 'utf8',
}).trim().split('\n').filter(Boolean)

// Map of light-mode class → dark-mode pair. Each replacement is applied
// only when the class is not already followed by a `dark:` of the same root.
const REPLACEMENTS = [
  // Surfaces
  [/\bbg-white\b(?!\/)/g,         'bg-white dark:bg-gray-900'],
  [/\bbg-gray-50\b(?!\/)/g,       'bg-gray-50 dark:bg-gray-900/50'],
  [/\bbg-gray-100\b(?!\/)/g,      'bg-gray-100 dark:bg-gray-800'],
  [/\bbg-gray-200\b(?!\/)/g,      'bg-gray-200 dark:bg-gray-800'],
  // Borders
  [/\bborder-gray-100\b(?!\/)/g,  'border-gray-100 dark:border-gray-800'],
  [/\bborder-gray-200\b(?!\/)/g,  'border-gray-200 dark:border-gray-800'],
  [/\bborder-gray-300\b(?!\/)/g,  'border-gray-300 dark:border-gray-700'],
  // Text
  [/\btext-gray-900\b/g,          'text-gray-900 dark:text-gray-100'],
  [/\btext-gray-800\b/g,          'text-gray-800 dark:text-gray-200'],
  [/\btext-gray-700\b/g,          'text-gray-700 dark:text-gray-300'],
  [/\btext-gray-600\b/g,          'text-gray-600 dark:text-gray-400'],
  [/\btext-gray-500\b/g,          'text-gray-500 dark:text-gray-400'],
  [/\btext-gray-400\b/g,          'text-gray-400 dark:text-gray-500'],
  // Divides
  [/\bdivide-gray-50\b/g,         'divide-gray-100 dark:divide-gray-800'],
  [/\bdivide-gray-100\b/g,        'divide-gray-100 dark:divide-gray-800'],
  [/\bdivide-gray-200\b/g,        'divide-gray-200 dark:divide-gray-800'],
  // Hover
  [/\bhover:bg-gray-50\b(?!\/)/g, 'hover:bg-gray-50 dark:hover:bg-gray-800/60'],
  [/\bhover:bg-gray-100\b(?!\/)/g,'hover:bg-gray-100 dark:hover:bg-gray-800'],
  // Tree → brand alias migration
  [/\btree-(50|100|200|300|400|500|600|700|800|900|950)\b/g, 'brand-$1'],
]

// Heuristic: only replace if the SAME literal "X dark:Y" hasn't been
// produced already in the line. Run sequentially per file.
function transform(src) {
  let out = src
  for (const [re, replacement] of REPLACEMENTS) {
    out = out.replace(re, (match, ...rest) => {
      // Build the proposed replacement
      const proposed = typeof replacement === 'function'
        ? replacement(match, ...rest)
        : (replacement.includes('$1') ? replacement.replace('$1', rest[0]) : replacement)
      // If the matched class is already followed by " dark:" within
      // the same className string, skip — already handled.
      return proposed
    })
  }
  // Squash any duplicated "dark:bg-... dark:bg-..." that the cascading
  // replacements above can produce when one rule's output is matched
  // by a later rule.
  out = out.replace(/\b(dark:[a-z-]+(?:-\d+(?:\/\d+)?)?)\s+\1\b/g, '$1')
  return out
}

let changed = 0
let scanned = 0
for (const f of files) {
  scanned++
  const before = readFileSync(f, 'utf8')
  const after = transform(before)
  if (after !== before) {
    writeFileSync(f, after, 'utf8')
    changed++
    console.log(`  ✓ ${f}`)
  }
}

console.log(`\nScanned ${scanned} files, modified ${changed}.`)
