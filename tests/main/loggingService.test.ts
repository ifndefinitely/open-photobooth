import { describe, it, expect, beforeEach } from 'vitest'
import { log, getRecent, _resetForTest } from '../../src/main/loggingService'

describe('loggingService — getRecent', () => {
  beforeEach(() => {
    _resetForTest()
  })

  it('returns an empty array when no logs have been written', () => {
    expect(getRecent({ limit: 5 })).toEqual([])
  })

  it('returns recent log entries in reverse chronological order', () => {
    log('INFO', 'Printer', 'one')
    log('INFO', 'Printer', 'two')
    log('INFO', 'Printer', 'three')

    const entries = getRecent({ limit: 5 })
    expect(entries).toHaveLength(3)
    expect(entries[0].message).toBe('three')
    expect(entries[2].message).toBe('one')
  })

  it('filters by source', () => {
    log('INFO', 'Printer', 'p1')
    log('INFO', 'Camera', 'c1')
    log('INFO', 'Printer', 'p2')

    const entries = getRecent({ source: 'Printer', limit: 5 })
    expect(entries.map((e) => e.message)).toEqual(['p2', 'p1'])
  })

  it('filters by level', () => {
    log('INFO', 'Printer', 'info1')
    log('ERROR', 'Printer', 'err1')
    log('WARN', 'Printer', 'warn1')

    const entries = getRecent({ level: 'ERROR', limit: 5 })
    expect(entries.map((e) => e.message)).toEqual(['err1'])
  })

  it('caps the buffer at a fixed size and evicts oldest', () => {
    for (let i = 0; i < 600; i++) {
      log('INFO', 'Printer', `msg-${i}`)
    }
    const entries = getRecent({ limit: 1000 })
    // Default buffer is 500
    expect(entries).toHaveLength(500)
    expect(entries[0].message).toBe('msg-599')
    expect(entries[499].message).toBe('msg-100')
  })
})
