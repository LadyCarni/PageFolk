import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

const mockRequireUser = vi.fn()
const mockRequireAdmin = vi.fn()
vi.mock('@/lib/session', () => ({
  requireUser: () => mockRequireUser(),
  requireAdmin: () => mockRequireAdmin(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import {
  suggestBookAction,
  editSuggestionAction,
  deleteSuggestionAction,
  toggleLongListVoteAction,
  chooseLongListBookAction,
} from '@/app/long-list/actions'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSuggestion } from '@/lib/long-list'

const fields = (over: Record<string, string> = {}) => {
  const fd = new FormData()
  const all = {
    title: 'The Remains of the Day',
    author: 'Kazuo Ishiguro',
    genre: '',
    synopsis: 'A butler looks back.',
    ...over,
  }
  for (const [k, v] of Object.entries(all)) fd.set(k, v)
  return fd
}

describe('long list actions', () => {
  let member: { id: string; isAdmin: boolean }
  let other: { id: string; isAdmin: boolean }
  let admin: { id: string; isAdmin: boolean }

  beforeEach(async () => {
    vi.mocked(revalidatePath).mockClear()
    vi.mocked(redirect).mockClear()
    mockRequireUser.mockReset()
    mockRequireAdmin.mockReset()
    await prisma.longListVote.deleteMany()
    await prisma.longListBook.deleteMany()
    // Other suites leave rows that reference books and users; clear them in dependency order.
    await prisma.readingProgress.deleteMany()
    await prisma.post.deleteMany()
    await prisma.threadMembership.deleteMany()
    await prisma.section.deleteMany()
    await prisma.bookCover.deleteMany()
    await prisma.chapterName.deleteMany()
    await prisma.book.deleteMany()
    await prisma.user.deleteMany()
    const m = await prisma.user.create({ data: { googleId: 'g-m', email: 'm@example.com', name: 'Mo' } })
    const o = await prisma.user.create({ data: { googleId: 'g-o', email: 'o@example.com', name: 'Otto' } })
    const a = await prisma.user.create({ data: { googleId: 'g-a', email: 'a@example.com', name: 'Ada' } })
    member = { id: m.id, isAdmin: false }
    other = { id: o.id, isAdmin: false }
    admin = { id: a.id, isAdmin: true }
    mockRequireUser.mockResolvedValue(member)
    mockRequireAdmin.mockResolvedValue(admin)
  })

  const seed = () =>
    createSuggestion(member.id, {
      title: 'Dune',
      author: 'Frank Herbert',
      genre: '',
      synopsis: 'Sand.',
    })

  it('suggest saves and returns the new id', async () => {
    const result = await suggestBookAction(fields())
    const saved = await prisma.longListBook.findFirstOrThrow()
    expect(result).toEqual({ bookId: saved.id })
    expect(saved.suggestedById).toBe(member.id)
    expect(revalidatePath).toHaveBeenCalledWith('/long-list')
    expect(revalidatePath).toHaveBeenCalledWith('/long-list/[bookId]', 'page')
  })

  it('suggest returns the validation message and saves nothing', async () => {
    expect(await suggestBookAction(fields({ title: '   ' }))).toEqual({ error: 'Add a title' })
    expect(await prisma.longListBook.count()).toBe(0)
  })

  it('suggest returns the duplicate message and href', async () => {
    const { id } = await seed()
    const result = await suggestBookAction(fields({ title: '  DUNE ', author: 'frank herbert' }))
    expect(result).toEqual({ error: 'That book is already on the Long List', href: `/long-list?book=${id}` })
    expect(await prisma.longListBook.count()).toBe(1)
  })

  it("a member editing someone else's suggestion is rejected and nothing changes", async () => {
    const { id } = await seed()
    mockRequireUser.mockResolvedValue(other)
    const fd = fields({ title: 'Hijacked' })
    fd.set('id', id)
    await expect(editSuggestionAction(fd)).rejects.toThrow('Forbidden: not your suggestion')
    expect((await prisma.longListBook.findUniqueOrThrow({ where: { id } })).title).toBe('Dune')
  })

  it("a member deleting someone else's suggestion is rejected and nothing changes", async () => {
    const { id } = await seed()
    mockRequireUser.mockResolvedValue(other)
    await expect(deleteSuggestionAction(id)).rejects.toThrow('Forbidden: not your suggestion')
    expect(await prisma.longListBook.count()).toBe(1)
  })

  it('the admin can edit and delete any suggestion', async () => {
    const { id } = await seed()
    mockRequireUser.mockResolvedValue(admin)
    const fd = fields({ title: 'Dune Messiah' })
    fd.set('id', id)
    expect(await editSuggestionAction(fd)).toEqual({ bookId: id })
    expect((await prisma.longListBook.findUniqueOrThrow({ where: { id } })).title).toBe('Dune Messiah')
    expect(await deleteSuggestionAction(id)).toEqual({})
    expect(await prisma.longListBook.count()).toBe(0)
  })

  it('vote toggles and revalidates /long-list', async () => {
    const { id } = await seed()
    expect(await toggleLongListVoteAction(id)).toEqual({})
    expect(await prisma.longListVote.count()).toBe(1)
    expect(revalidatePath).toHaveBeenCalledWith('/long-list')
    expect(await toggleLongListVoteAction(id)).toEqual({})
    expect(await prisma.longListVote.count()).toBe(0)
  })

  it('voting on a gone book returns the gone message', async () => {
    expect(await toggleLongListVoteAction('nope')).toEqual({ error: 'That book is no longer on the Long List' })
  })

  it('choose rejects a non-admin and leaves the suggestion', async () => {
    const { id } = await seed()
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: admin only'))
    const fd = new FormData()
    fd.set('id', id)
    fd.set('totalChapters', '10')
    await expect(chooseLongListBookAction(fd)).rejects.toThrow('Forbidden')
    expect(await prisma.longListBook.count()).toBe(1)
    expect(await prisma.book.count()).toBe(0)
    expect(redirect).not.toHaveBeenCalled()
  })

  it('choose as admin creates the book, removes the suggestion, and redirects to /admin?book=<id>', async () => {
    const { id } = await seed()
    const fd = new FormData()
    fd.set('id', id)
    fd.set('totalChapters', '10')
    await chooseLongListBookAction(fd)
    const book = await prisma.book.findFirstOrThrow()
    expect(book.title).toBe('Dune')
    expect(await prisma.longListBook.count()).toBe(0)
    expect(redirect).toHaveBeenCalledWith(`/admin?book=${book.id}`)
    for (const p of ['/admin', '/', '/shelf', '/long-list']) expect(revalidatePath).toHaveBeenCalledWith(p)
  })
})
