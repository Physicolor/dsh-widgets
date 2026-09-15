/**
 * Probe: read a Chromium/Edge localStorage value straight out of the browser's
 * LevelDB store, so a widget's REAL on-screen figure can be audited against the
 * authoritative usage index instead of being guessed.
 *
 * Chromium keeps localStorage in `<profile>/Local Storage/leveldb`. Values land
 * in `.ldb` tables whose data blocks are usually snappy-compressed, which is why
 * a plain text search for the key finds only small values. This script parses
 * the table footer -> index block -> every data block, decompresses snappy, and
 * prints the entries whose key matches a substring.
 *
 * Usage:
 *   node docs/probe-localstorage.mjs <leveldb-dir> [keySubstring]
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── snappy raw-block decoder ──
function snappyUncompress(input) {
  let pos = 0
  const varint = () => {
    let result = 0
    let shift = 0
    for (;;) {
      const b = input[pos++]
      result |= (b & 0x7f) << shift
      if ((b & 0x80) === 0) return result >>> 0
      shift += 7
    }
  }
  const expected = varint()
  const out = Buffer.alloc(expected)
  let o = 0
  while (pos < input.length) {
    const tag = input[pos++]
    const type = tag & 3
    if (type === 0) {
      let len = (tag >> 2) + 1
      if (len > 60) {
        const extra = len - 60
        len = 0
        for (let i = 0; i < extra; i++) len |= input[pos++] << (8 * i)
        len = (len >>> 0) + 1
      }
      input.copy(out, o, pos, pos + len)
      pos += len
      o += len
      continue
    }
    let len
    let offset
    if (type === 1) {
      len = ((tag >> 2) & 0x7) + 4
      offset = ((tag >> 5) << 8) | input[pos++]
    } else if (type === 2) {
      len = (tag >> 2) + 1
      offset = input[pos] | (input[pos + 1] << 8)
      pos += 2
    } else {
      len = (tag >> 2) + 1
      offset = input[pos] | (input[pos + 1] << 8) | (input[pos + 2] << 16) | (input[pos + 3] << 24)
      pos += 4
    }
    for (let i = 0; i < len; i++) {
      out[o] = out[o - offset]
      o++
    }
  }
  return out.subarray(0, o)
}

// ── leveldb table reading ──
const readVarint = (buf, start) => {
  let result = 0
  let shift = 0
  let pos = start
  for (;;) {
    const b = buf[pos++]
    result += (b & 0x7f) * 2 ** shift
    if ((b & 0x80) === 0) return [result, pos]
    shift += 7
  }
}
const readBlockHandle = (buf, start) => {
  let [offset, pos] = readVarint(buf, start)
  let size
  ;[size, pos] = readVarint(buf, pos)
  return [{ offset, size }, pos]
}
/** Container of the footer's fields: metaindex and index handles. */
function readFooter(buf) {
  const footerStart = buf.length - 48
  const [, afterMeta] = readBlockHandle(buf, footerStart)
  const [indexHandle] = readBlockHandle(buf, afterMeta)
  return { indexHandle }
}
/** Read one block. NOTE: in leveldb the handle's `size` is the DATA length; the
 *  5-byte trailer (1 type byte + 4 crc bytes) follows the data, so the type byte
 *  sits at `offset + size`, NOT at `offset + size - 5`. */
function readBlock(buf, handle) {
  const data = buf.subarray(handle.offset, handle.offset + handle.size)
  const type = buf[handle.offset + handle.size]
  if (type === 1) return snappyUncompress(data)
  if (type === 0) return data
  throw new Error('unsupported block compression ' + type)
}
function parseEntries(block) {
  const entries = []
  // The block ends with the restart array: [offset × count][count]. Parsing must
  // stop at the array, otherwise its bytes are read as a bogus trailing entry.
  const restartCount = block.length >= 4 ? block.readUInt32LE(block.length - 4) : 0
  const entriesEnd = block.length - 4 - restartCount * 4
  if (entriesEnd < 0) throw new Error('bad restart array')
  let pos = 0
  let prevKey = null
  while (pos < entriesEnd) {
    let shared
    let nonShared
    let valueLen
    ;[shared, pos] = readVarint(block, pos)
    ;[nonShared, pos] = readVarint(block, pos)
    ;[valueLen, pos] = readVarint(block, pos)
    if (pos + nonShared + valueLen > entriesEnd + 1) throw new Error('entry overruns block')
    const keyTail = block.subarray(pos, pos + nonShared)
    pos += nonShared
    const value = block.subarray(pos, pos + valueLen)
    pos += valueLen
    let key
    if (shared > 0) {
      if (prevKey === null || shared > prevKey.length) throw new Error('corrupt key')
      key = Buffer.concat([prevKey.subarray(0, shared), keyTail])
    } else {
      key = keyTail
    }
    prevKey = key
    entries.push({ key, value })
  }
  return entries
}

const dir = process.argv[2]
const needle = process.argv[3] ?? 'harness-widgets'
if (!dir) {
  console.error('usage: node docs/probe-localstorage.mjs <leveldb-dir> [keySubstring]')
  process.exit(2)
}

const verbose = process.env.PROBE_VERBOSE === '1'
let printed = 0
for (const name of readdirSync(dir)) {
  if (!name.endsWith('.ldb')) continue
  const buf = readFileSync(join(dir, name))
  if (buf.length < 48) continue
  let indexHandle
  try {
    ;({ indexHandle } = readFooter(buf))
  } catch {
    continue
  }
  let indexEntries
  try {
    indexEntries = parseEntries(readBlock(buf, indexHandle))
  } catch (err) {
    if (verbose) console.error(name, 'index block failed:', err.message)
    continue
  }
  let blocksOk = 0
  let blocksFailed = 0
  let entriesSeen = 0
  for (const entry of indexEntries) {
    let handle
    try {
      ;[handle] = readBlockHandle(entry.value, 0)
    } catch {
      continue
    }
    if (!(handle.offset + handle.size <= buf.length)) {
      blocksFailed += 1
      if (verbose) console.error(name, 'handle out of range', handle)
      continue
    }
    let dataEntries
    try {
      dataEntries = parseEntries(readBlock(buf, handle))
      blocksOk += 1
      entriesSeen += dataEntries.length
    } catch (err) {
      blocksFailed += 1
      if (verbose) console.error(name, `block @${handle.offset}+${handle.size} failed:`, err.message)
      continue
    }
    for (const { key, value } of dataEntries) {
      const text = key.toString('utf8')
      const at = text.indexOf(needle)
      if (at < 0) continue
      printed += 1
      console.log(`\n=== ${name} ===`)
      console.log('key  :', JSON.stringify(text))
      console.log('value:', value.toString('utf8'))
    }
  }
  if (verbose) console.error(`${name}: indexEntries=${indexEntries.length} blocksOk=${blocksOk} blocksFailed=${blocksFailed} entriesSeen=${entriesSeen}`)
}
console.log(`\n[matched ${printed} entr(ies)]`)
