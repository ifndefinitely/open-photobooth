import { describe, it, expect } from 'vitest'

describe('sample test', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle string operations', () => {
    expect('Open Photobooth').toContain('Photobooth')
  })
})
