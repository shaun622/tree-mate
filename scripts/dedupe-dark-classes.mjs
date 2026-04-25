// Dedupe duplicate dark:* classes that the sweep script can produce when
// cascading replacements pile up. For each className-like string, keep the
// LAST occurrence of each `dark:<property>-<rest>` token, where property
// is the Tailwind utility name (bg, text, border, hover:bg, etc).

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const files = execSync('git ls-files "src/**/*.jsx"', {
  cwd: process.cwd(),
  encoding: 'utf8',
}).trim().split('\n').filter(Boolean)

// Match `className="..."` and `cn('...', '...')` arg strings so we
// don't accidentally touch other code. We process whitespace-separated
// class tokens within those strings.
const STRING_LITERAL = /(['"`])((?:\\.|(?!\1)[^\\\n])*?)\1/g

// For a `dark:` token, extract the property prefix so we can dedupe by it.
// Examples:
//   dark:bg-gray-900       → bg
//   dark:text-gray-400     → text
//   dark:hover:bg-gray-800 → hover:bg
//   dark:border-gray-700   → border
//   dark:placeholder:text-gray-500 → placeholder:text
function darkPropertyKey(token) {
  if (!token.startsWith('dark:')) return null
  const rest = token.slice(5) // strip "dark:"
  // Property is everything up to the LAST `-` whose rest contains a digit
  // or a known suffix. Simpler: split by `-`, the property is the part
  // before any number-suffix segment.
  const m = rest.match(/^((?:[a-z]+:)*[a-z]+(?:-[a-z]+)*?)-(.*)$/)
  if (!m) return rest // bare modifier, treat as its own key
  // m[1] = property root e.g. "bg" or "hover:bg" or "border"
  // m[2] = value, e.g. "gray-900"
  return m[1]
}

function dedupeInString(s) {
  // tokens preserving original separators is hard; for our use case the
  // strings are className lists with single-space separators
  const tokens = s.split(/(\s+)/)
  const seen = new Map() // dark-key → last index in `tokens`
  // First pass — find indices of dark:* tokens and keep only the last
  // per property key
  const dropIdx = new Set()
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (!t.startsWith('dark:')) continue
    const key = darkPropertyKey(t)
    if (key == null) continue
    if (seen.has(key)) {
      dropIdx.add(seen.get(key))
    }
    seen.set(key, i)
  }
  if (dropIdx.size === 0) return s
  // Drop the marked tokens AND the whitespace token immediately following
  // them (if any) to avoid double spaces. If the dropped token is at the
  // start/end of the array we drop the leading whitespace instead.
  const out = []
  for (let i = 0; i < tokens.length; i++) {
    if (dropIdx.has(i)) {
      // skip following whitespace too
      if (i + 1 < tokens.length && /^\s+$/.test(tokens[i + 1])) i++
      continue
    }
    out.push(tokens[i])
  }
  return out.join('')
}

let changed = 0
let scanned = 0
for (const f of files) {
  scanned++
  const before = readFileSync(f, 'utf8')
  let modified = false
  const after = before.replace(STRING_LITERAL, (full, quote, body) => {
    if (!body.includes('dark:')) return full
    const cleaned = dedupeInString(body)
    if (cleaned !== body) {
      modified = true
      return `${quote}${cleaned}${quote}`
    }
    return full
  })
  if (modified) {
    writeFileSync(f, after, 'utf8')
    changed++
    console.log(`  ✓ ${f}`)
  }
}

console.log(`\nDedupe: scanned ${scanned}, modified ${changed}.`)
