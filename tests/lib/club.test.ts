import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { getClubName, setClubName } from '@/lib/club'
import { ValidationError } from '@/lib/errors'

describe('club name', () => {
  beforeEach(async () => {
    await prisma.club.deleteMany()
  })

  it('is null until it has been set', async () => {
    expect(await getClubName()).toBeNull()
  })

  it('stores the trimmed name', async () => {
    await setClubName('  The Thursday Readers  ')
    expect(await getClubName()).toBe('The Thursday Readers')
  })

  it('replaces the name and keeps a single row', async () => {
    await setClubName('First')
    await setClubName('Second')
    expect(await getClubName()).toBe('Second')
    expect(await prisma.club.count()).toBe(1)
  })

  it('rejects blank, whitespace-only and over-long names without changing the stored one', async () => {
    await setClubName('Keep me')
    await expect(setClubName('')).rejects.toBeInstanceOf(ValidationError)
    await expect(setClubName('   ')).rejects.toThrow('Club name is required')
    await expect(setClubName('a'.repeat(41))).rejects.toThrow('40 characters or fewer')
    expect(await getClubName()).toBe('Keep me')
  })

  it('accepts a name of exactly 40 characters', async () => {
    await setClubName('a'.repeat(40))
    expect(await getClubName()).toBe('a'.repeat(40))
  })
})
