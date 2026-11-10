import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/changelog', async (orig) => ({
  ...(await orig<typeof import('@/lib/changelog')>()),
  CHANGELOG: [
    { version: '1.1', date: '2026-10-25', lines: [{ text: 'Shipped thing', roadmap: 1 }, { text: 'Ghost', roadmap: 999 }, { text: 'Plain' }] },
    { version: '1.0', date: '2026-10-24', lines: [{ text: 'Old' }] },
  ],
}))

import { prisma } from '@/lib/db'
import { getWhatsNewView } from '@/lib/whats-new-view'
import { submitRequest, approveRequest, declineRequest, createAdminItem, setItemStatus, toggleVote } from '@/lib/roadmap'

describe('getWhatsNewView', () => {
  beforeEach(async () => {
    await prisma.roadmapEntry.deleteMany()
    await prisma.roadmapVote.deleteMany()
    await prisma.roadmapItem.deleteMany()
    await prisma.user.deleteMany({ where: { googleId: { in: ['wn-m', 'wn-o', 'wn-ad', 'wn-v1', 'wn-v2', 'wn-v3'] } } })
  })

  async function setup() {
    const member = await prisma.user.create({ data: { googleId: 'wn-m', email: 'wnm@example.com', name: 'Mem' } })
    const other = await prisma.user.create({ data: { googleId: 'wn-o', email: 'wno@example.com', name: 'Other' } })
    const admin = await prisma.user.create({ data: { googleId: 'wn-ad', email: 'wnad@example.com', name: 'Boss' } })
    const voters = []
    for (const g of ['wn-v1', 'wn-v2', 'wn-v3']) {
      voters.push(await prisma.user.create({ data: { googleId: g, email: `${g}@example.com` } }))
    }
    return { member, other, admin, voters }
  }
  const asViewer = (u: { id: string }, isAdmin = false) => ({ id: u.id, isAdmin })

  it('sorts in progress first, then by votes', async () => {
    const { admin, voters, member } = await setup()
    await createAdminItem(admin.id, 'Shipped placeholder', 'd') // number 1, shipped in fixture
    const a = await createAdminItem(admin.id, 'A planned 3', 'd')
    const b = await createAdminItem(admin.id, 'B planned 1', 'd')
    const c = await createAdminItem(admin.id, 'C in progress 0', 'd')
    await setItemStatus(c.id, admin.id, 'in_progress')
    for (const v of voters) await toggleVote(a.id, v.id)
    await toggleVote(b.id, voters[0].id)
    await toggleVote(a.id, member.id)
    const view = await getWhatsNewView(asViewer(member), '1.1')
    expect(view.roadmap.map((r) => r.title)).toEqual(['C in progress 0', 'A planned 3', 'B planned 1'])
    expect(view.roadmap[1].votes).toBe(4)
    expect(view.roadmap[1].votedByViewer).toBe(true)
    expect(view.roadmap[2].votedByViewer).toBe(false)
  })

  it('handles shipped items and changelog links', async () => {
    const { member, admin } = await setup()
    const req = await submitRequest(member.id, 'Shiny', 'please')
    await approveRequest(req.id, admin.id, 'Shiny', 'please') // number 1
    const view = await getWhatsNewView(asViewer(member), '1.0', req.id)
    expect(view.roadmap).toHaveLength(0)
    expect(view.myRequests).toEqual([{ id: req.id, title: 'Shiny', display: { kind: 'shipped', version: '1.1' } }])
    const last = view.selected!.entries.at(-1)!
    expect(last).toEqual({ kind: 'event', text: 'Shipped in 1.1', at: new Date('2026-10-25') })
    expect(view.selected!.headerStatus).toEqual({ kind: 'shipped', version: '1.1' })
    const lines = view.changelog[0].lines
    expect(lines[0]).toEqual({ text: 'Shipped thing', itemId: req.id, isMemberRequest: true })
    expect(lines[1]).toEqual({ text: 'Ghost', itemId: null, isMemberRequest: false })
    expect(view.changelog.map((v) => v.isNew)).toEqual([true, false])
    const all = await getWhatsNewView(asViewer(member), null)
    // A first visit (nothing seen yet) tags only the latest version, not the whole history.
    expect(all.changelog.map((v) => v.isNew)).toEqual([true, false])
  })

  it('hides review items from other members', async () => {
    const { member, other, admin } = await setup()
    const req = await submitRequest(member.id, 'Secret', 'x')
    expect((await getWhatsNewView(asViewer(other), null, req.id)).selected).toBeNull()
    expect((await getWhatsNewView(asViewer(member), null, req.id)).selected?.headerStatus).toEqual({ kind: 'review' })
    expect((await getWhatsNewView(asViewer(admin, true), null, req.id)).selected?.id).toBe(req.id)
    expect((await getWhatsNewView(asViewer(admin, true), null, 'nope')).selected).toBeNull()
    expect((await getWhatsNewView(asViewer(other), null)).myRequests).toEqual([])
  })

  it('orders a declined thread: original, event, reply', async () => {
    const { member, admin } = await setup()
    const req = await submitRequest(member.id, 'Nope', 'x')
    await declineRequest(req.id, admin.id, 'Not now')
    const view = await getWhatsNewView(asViewer(member), null, req.id)
    const e = view.selected!.entries
    expect(e.map((x) => x.kind)).toEqual(['original', 'event', 'reply'])
    expect(e[0]).toMatchObject({ author: { id: member.id, name: 'Mem' }, title: 'Nope' })
    expect(e[1]).toMatchObject({ text: 'Marked not planned' })
    expect(e[2]).toMatchObject({ body: 'Not now', author: { id: admin.id, name: 'Boss' } })
    expect(view.selected!.headerStatus).toEqual({ kind: 'not_planned' })
    expect(view.myRequests[0].display).toEqual({ kind: 'not_planned' })
  })
})
