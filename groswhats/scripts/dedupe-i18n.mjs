import fs from 'fs'

const path = 'src/i18n.ts'
let s = fs.readFileSync(path, 'utf8')

function dedupeObject(src, startMarker) {
  const start = src.indexOf(startMarker)
  if (start < 0) throw new Error('marker not found ' + startMarker)
  const brace = src.indexOf('{', start)
  let i = brace + 1
  let depth = 1
  while (i < src.length && depth > 0) {
    const c = src[i]
    if (c === '{') depth++
    else if (c === '}') depth--
    i++
  }
  const end = i
  const body = src.slice(brace + 1, end - 1)
  const lines = body.split('\n')
  const keyRe = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/

  const firstOcc = new Map()
  for (let li = 0; li < lines.length; li++) {
    const m = lines[li].match(keyRe)
    if (!m) continue
    const key = m[2]
    if (!firstOcc.has(key)) firstOcc.set(key, [])
    firstOcc.get(key).push(li)
  }

  function propEnd(startLi) {
    const indent = (lines[startLi].match(/^(\s*)/) || ['', ''])[1].length
    let li = startLi + 1
    while (li < lines.length) {
      const m = lines[li].match(keyRe)
      if (m && m[1].length <= indent) return li
      li++
    }
    return lines.length
  }

  const remove = new Set()
  let dupes = 0
  for (const [, starts] of firstOcc) {
    if (starts.length < 2) continue
    dupes += starts.length - 1
    // keep LAST occurrence (often newer multi-poste / easy UX)
    for (let k = 0; k < starts.length - 1; k++) {
      const a = starts[k]
      const b = propEnd(a)
      for (let x = a; x < b; x++) remove.add(x)
    }
  }
  console.log(startMarker, 'removed', dupes, 'duplicate keys')
  const newBody = lines.filter((_, li) => !remove.has(li)).join('\n')
  return src.slice(0, brace + 1) + newBody + src.slice(end - 1)
}

s = dedupeObject(s, 'const ar: Dict')
s = dedupeObject(s, 'const fr: Dict')
fs.writeFileSync(path, s)
console.log('ok')
