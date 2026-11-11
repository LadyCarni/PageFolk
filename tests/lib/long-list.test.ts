import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { DuplicateBookError, ValidationError } from '@/lib/errors'
import {
  listLongList,
  getLongListEntry,
  createSuggestion,
  updateSuggestion,
  deleteSuggestion,
  toggleLongListVote,
  type Actor,
} from '@/lib/long-list'

const input = (over: Partial<{ title: string; author: string; genre: string; synopsis: string }> = {}) => ({
  title: 'The Remains of the Day',
  author: 'Kazuo Ishiguro',
  genre: '',
  synopsis: 'A butler looks back.',
  ...over,
})

describe('long list', () => {
  let member: Actor
  let other: Actor
  let admin: Actor

  beforeEach(async () => {
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
    member = { id: m.id, isAdmin: false }
    other = { id: o.id, isAdmin: false }
    admin = { id: 'admin-id', isAdmin: true }
  })

  it('creates a suggestion with trimmed fields and null genre for \'\'', async () => {
    const { id } = await createSuggestion(
      member.id,
      input({ title: '  Dune ', author: ' Frank Herbert ', synopsis: '  Sand. ', genre: '' }),
    )
    const row = await prisma.longListBook.findUniqueOrThrow({ where: { id } })
    expect(row).toMatchObject({ title: 'Dune', author: 'Frank Herbert', synopsis: 'Sand.', genre: null, suggestedById: member.id })
  })

  it('rejects invalid input with the validation message and saves nothing', async () => {
    await expect(createSuggestion(member.id, input({ title: '  ' }))).rejects.toThrow('Add a title')
    expect(await prisma.longListBook.count()).toBe(0)
  })

  it('blocks a Long List duplicate regardless of case and spacing', async () => {
    const { id } = await createSuggestion(member.id, input())
    const err = await createSuggestion(
      other.id,
      input({ title: '  the  REMAINS of the day ', author: 'kazuo   ishiguro' }),
    ).catch((e) => e)
    expect(err).toBeInstanceOf(DuplicateBookError)
    expect(err.message).toBe('That book is already on the Long List')
    expect(err.href).toBe(`/long-list?book=${id}`)
    expect(await prisma.longListBook.count()).toBe(1)
  })

  it('blocks club books by status', async () => {
    const mk = (status: string) =>
      prisma.book.create({ data: { title: 'Dune', author: 'Frank Herbert', status, totalChapters: 3 } })
    const past = await mk('past')
    const current = await mk('current')
    const upcoming = await mk('upcoming')
    const attempt = async () => createSuggestion(member.id, input({ title: 'Dune', author: 'Frank Herbert' })).catch((e) => e)

    // Only one status present at a time so each is the match.
    await prisma.book.deleteMany({ where: { id: { in: [current.id, upcoming.id] } } })
    let err = await attempt()
    expect(err).toBeInstanceOf(DuplicateBookError)
    expect([err.message, err.href]).toEqual(['The club has already read that one', `/shelf/${past.id}`])

    await prisma.book.deleteMany({ where: { id: past.id } })
    const cur = await mk('current')
    err = await attempt()
    expect([err.message, err.href]).toEqual(["That's the club's current book", '/'])
    await prisma.book.deleteMany({ where: { id: cur.id } })

    await mk('upcoming')
    err = await attempt()
    expect([err.message, err.href]).toEqual(["That one's already lined up for the club", null])
  })

  it('editing without changing the title is not a duplicate; editing to another suggestion\'s title is', async () => {
    const { id } = await createSuggestion(member.id, input())
    await createSuggestion(member.id, input({ title: 'Dune', author: 'Frank Herbert' }))
    await updateSuggestion(id, member, input({ synopsis: 'New synopsis.' }))
    expect((await prisma.longListBook.findUniqueOrThrow({ where: { id } })).synopsis).toBe('New synopsis.')
    await expect(updateSuggestion(id, member, input({ title: 'dune', author: 'frank herbert' }))).rejects.toBeInstanceOf(
      DuplicateBookError,
    )
  })

  it('edit keeps votes', async () => {
    const { id } = await createSuggestion(member.id, input())
    await toggleLongListVote(id, other.id)
    await updateSuggestion(id, member, input({ synopsis: 'Changed.' }))
    expect(await prisma.longListVote.count({ where: { bookId: id } })).toBe(1)
  })

  it('other members cannot edit or delete; the admin can', async () => {
    const { id } = await createSuggestion(member.id, input())
    await expect(updateSuggestion(id, other, input({ synopsis: 'Hacked.' }))).rejects.toThrow(
      'Forbidden: not your suggestion',
    )
    await expect(deleteSuggestion(id, other)).rejects.toThrow('Forbidden: not your suggestion')
    expect((await prisma.longListBook.findUniqueOrThrow({ where: { id } })).synopsis).toBe('A butler looks back.')

    await updateSuggestion(id, admin, input({ synopsis: 'Admin edit.' }))
    expect((await prisma.longListBook.findUniqueOrThrow({ where: { id } })).synopsis).toBe('Admin edit.')
    await deleteSuggestion(id, admin)
    expect(await prisma.longListBook.count()).toBe(0)
  })

  it('delete removes the book and its votes', async () => {
    const { id } = await createSuggestion(member.id, input())
    await toggleLongListVote(id, other.id)
    await deleteSuggestion(id, member)
    expect(await prisma.longListBook.count()).toBe(0)
    expect(await prisma.longListVote.count()).toBe(0)
  })

  it('toggle adds then removes a vote', async () => {
    const { id } = await createSuggestion(member.id, input())
    expect(await toggleLongListVote(id, other.id)).toBe(true)
    expect(await prisma.longListVote.count({ where: { bookId: id } })).toBe(1)
    expect(await toggleLongListVote(id, other.id)).toBe(false)
    expect(await prisma.longListVote.count({ where: { bookId: id } })).toBe(0)
  })

  it('a double tap never throws or leaves two votes', async () => {
    const { id } = await createSuggestion(member.id, input())
    await expect(Promise.all([toggleLongListVote(id, member.id), toggleLongListVote(id, member.id)])).resolves.toBeDefined()
    expect(await prisma.longListVote.count({ where: { bookId: id, userId: member.id } })).toBeLessThanOrEqual(1)
  })

  it('voting, editing or deleting a missing book gives the gone message', async () => {
    const gone = 'That book is no longer on the Long List'
    await expect(toggleLongListVote('nope', member.id)).rejects.toThrow(gone)
    await expect(updateSuggestion('nope', member, input())).rejects.toThrow(gone)
    await expect(deleteSuggestion('nope', member)).rejects.toThrow(gone)
    await expect(toggleLongListVote('nope', member.id)).rejects.toBeInstanceOf(ValidationError)
  })

  it('listLongList fills votes, voted, voters in vote order, canEdit, and applies the sort', async () => {
    const a = await createSuggestion(member.id, input({ title: 'Zebra', author: 'A' }))
    const b = await createSuggestion(other.id, input({ title: 'Apple', author: 'B' }))
    await toggleLongListVote(b.id, member.id)
    await new Promise((r) => setTimeout(r, 15))
    await toggleLongListVote(b.id, other.id)

    const byVotes = await listLongList(member, 'votes')
    expect(byVotes.map((e) => e.title)).toEqual(['Apple', 'Zebra'])
    const apple = byVotes[0]
    expect(apple.votes).toBe(2)
    expect(apple.voted).toBe(true)
    expect(apple.voters.map((v) => v.name)).toEqual(['Mo', 'Otto'])
    expect(apple.canEdit).toBe(false)
    expect(apple.suggestedBy).toEqual({ id: other.id, name: 'Otto' })
    expect(byVotes[1]).toMatchObject({ votes: 0, voted: false, canEdit: true })

    expect((await listLongList(member, 'az')).map((e) => e.title)).toEqual(['Apple', 'Zebra'])
    expect((await listLongList(member, 'newest')).map((e) => e.title)).toEqual(['Apple', 'Zebra'])
    expect((await listLongList(admin, 'az')).every((e) => e.canEdit)).toBe(true)

    expect((await getLongListEntry(a.id, member))?.title).toBe('Zebra')
    expect(await getLongListEntry('nope', member)).toBeNull()
  })
})
