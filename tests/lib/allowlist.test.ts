import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { isEmailAllowed, addAllowedEmail, removeAllowedEmail, listAllowedEmails } from '@/lib/allowlist'

describe('allowlist', () => {
  beforeEach(async () => {
    await prisma.allowedEmail.deleteMany()
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
  })

  it('allows the admin email even if not explicitly listed', async () => {
    expect(await isEmailAllowed('admin@example.com')).toBe(true)
  })

  it('rejects an email that is neither listed nor the admin', async () => {
    expect(await isEmailAllowed('stranger@example.com')).toBe(false)
  })

  it('allows an email once added to the list', async () => {
    await addAllowedEmail('member@example.com')
    expect(await isEmailAllowed('member@example.com')).toBe(true)
  })

  it('is case-insensitive', async () => {
    await addAllowedEmail('Member@Example.com')
    expect(await isEmailAllowed('member@example.com')).toBe(true)
  })

  it('removes an email from the list', async () => {
    await addAllowedEmail('member@example.com')
    await removeAllowedEmail('member@example.com')
    expect(await isEmailAllowed('member@example.com')).toBe(false)
  })

  it('lists allowed emails in the order they were added', async () => {
    await addAllowedEmail('a@example.com')
    await addAllowedEmail('b@example.com')
    expect(await listAllowedEmails()).toEqual(['a@example.com', 'b@example.com'])
  })
})
