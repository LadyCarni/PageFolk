import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '@/lib/db'
import { isEmailAllowed } from '@/lib/allowlist'
import {
  allowOrRequestAccess,
  listAccessRequests,
  approveAccessRequest,
  dismissAccessRequest,
} from '@/lib/access-requests'

const stranger = { email: 'Stranger@Example.com', name: 'Sam Stranger', image: 'https://example.com/sam.png' }

describe('access requests', () => {
  beforeEach(async () => {
    await prisma.accessRequest.deleteMany()
    await prisma.allowedEmail.deleteMany()
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
  })

  it('lets an allowed email in without recording a request', async () => {
    await prisma.allowedEmail.create({ data: { email: 'member@example.com' } })
    expect(await allowOrRequestAccess({ email: 'member@example.com', name: 'Mem' })).toBe(true)
    expect(await listAccessRequests()).toEqual([])
  })

  it('turns away an unlisted email and records their request', async () => {
    expect(await allowOrRequestAccess(stranger)).toBe(false)
    const [request] = await listAccessRequests()
    expect(request).toMatchObject({
      email: 'stranger@example.com',
      name: 'Sam Stranger',
      avatarUrl: 'https://example.com/sam.png',
    })
    expect(request.requestedAt).toBeInstanceOf(Date)
  })

  it('turns away a sign-in with no email and records nothing', async () => {
    expect(await allowOrRequestAccess({ email: null, name: 'Nobody' })).toBe(false)
    expect(await listAccessRequests()).toEqual([])
  })

  it('keeps one request per person when they try again, with fresh details', async () => {
    await allowOrRequestAccess(stranger)
    await allowOrRequestAccess({ ...stranger, name: 'Sam S.' })
    const requests = await listAccessRequests()
    expect(requests).toHaveLength(1)
    expect(requests[0].name).toBe('Sam S.')
  })

  it('lists the newest requests first', async () => {
    await prisma.accessRequest.create({ data: { email: 'old@example.com', requestedAt: new Date('2026-01-01') } })
    await prisma.accessRequest.create({ data: { email: 'new@example.com', requestedAt: new Date('2026-02-01') } })
    expect((await listAccessRequests()).map((r) => r.email)).toEqual(['new@example.com', 'old@example.com'])
  })

  it('approving adds the email to the allowed list and clears the request', async () => {
    await allowOrRequestAccess(stranger)
    await approveAccessRequest('stranger@example.com')
    expect(await isEmailAllowed('stranger@example.com')).toBe(true)
    expect(await listAccessRequests()).toEqual([])
    expect(await allowOrRequestAccess(stranger)).toBe(true)
  })

  it('dismissing clears the request without allowing the email', async () => {
    await allowOrRequestAccess(stranger)
    await dismissAccessRequest('stranger@example.com')
    expect(await listAccessRequests()).toEqual([])
    expect(await isEmailAllowed('stranger@example.com')).toBe(false)
  })
})
