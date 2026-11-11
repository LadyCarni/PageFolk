import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { DuplicateBookError, ValidationError } from '@/lib/errors'
import { validateSuggestion } from '@/lib/limits'
import {
  duplicateKey,
  sortLongList,
  type LongListEntry,
  type LongListSort,
  type SuggestionInput,
} from '@/lib/long-list-view'

export type Actor = { id: string; isAdmin: boolean }

const GONE = 'That book is no longer on the Long List'

const entryInclude = {
  suggestedBy: { select: { id: true, name: true } },
  votes: {
    orderBy: { createdAt: 'asc' },
    select: { user: { select: { id: true, name: true } } },
  },
} satisfies Prisma.LongListBookInclude

type Row = Prisma.LongListBookGetPayload<{ include: typeof entryInclude }>

function toEntry(row: Row, viewer: Actor): LongListEntry {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    genre: row.genre,
    synopsis: row.synopsis,
    createdAt: row.createdAt,
    suggestedBy: row.suggestedBy,
    votes: row.votes.length,
    voted: row.votes.some((v) => v.user.id === viewer.id),
    voters: row.votes.map((v) => v.user),
    canEdit: viewer.isAdmin || row.suggestedById === viewer.id,
  }
}

export async function listLongList(viewer: Actor, sort: LongListSort): Promise<LongListEntry[]> {
  const rows = await prisma.longListBook.findMany({ include: entryInclude })
  return sortLongList(
    rows.map((r) => toEntry(r, viewer)),
    sort,
  )
}

export async function getLongListEntry(id: string, viewer: Actor): Promise<LongListEntry | null> {
  const row = await prisma.longListBook.findUnique({ where: { id }, include: entryInclude })
  return row ? toEntry(row, viewer) : null
}

// Throws DuplicateBookError if the book is already on the Long List or among the club's books.
async function assertNotDuplicate(input: SuggestionInput, excludeId?: string): Promise<void> {
  const key = duplicateKey(input.title, input.author)

  const suggestions = await prisma.longListBook.findMany({ select: { id: true, title: true, author: true } })
  const dupe = suggestions.find((b) => b.id !== excludeId && duplicateKey(b.title, b.author) === key)
  if (dupe) throw new DuplicateBookError('That book is already on the Long List', `/long-list?book=${dupe.id}`)

  const books = await prisma.book.findMany({ select: { id: true, title: true, author: true, status: true } })
  const clubBook = books.find((b) => duplicateKey(b.title, b.author) === key)
  if (clubBook) {
    if (clubBook.status === 'past') {
      throw new DuplicateBookError('The club has already read that one', `/shelf/${clubBook.id}`)
    }
    if (clubBook.status === 'current') throw new DuplicateBookError("That's the club's current book", '/')
    throw new DuplicateBookError("That one's already lined up for the club", null)
  }
}

function cleaned(input: SuggestionInput) {
  return {
    title: input.title.trim(),
    author: input.author.trim(),
    synopsis: input.synopsis.trim(),
    genre: input.genre.trim() || null,
  }
}

export async function createSuggestion(userId: string, input: SuggestionInput): Promise<{ id: string }> {
  const problem = validateSuggestion(input)
  if (problem) throw new ValidationError(problem)
  await assertNotDuplicate(input)
  const { id } = await prisma.longListBook.create({
    data: { ...cleaned(input), suggestedById: userId },
    select: { id: true },
  })
  return { id }
}

async function loadOwned(id: string, actor: Actor) {
  const book = await prisma.longListBook.findUnique({ where: { id }, select: { id: true, suggestedById: true } })
  if (!book) throw new ValidationError(GONE)
  if (!actor.isAdmin && book.suggestedById !== actor.id) throw new Error('Forbidden: not your suggestion')
  return book
}

export async function updateSuggestion(id: string, actor: Actor, input: SuggestionInput): Promise<void> {
  await loadOwned(id, actor)
  const problem = validateSuggestion(input)
  if (problem) throw new ValidationError(problem)
  await assertNotDuplicate(input, id)
  try {
    await prisma.longListBook.update({ where: { id }, data: cleaned(input) })
  } catch (e) {
    // Deleted between the check and the write.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw new ValidationError(GONE)
    throw e
  }
}

export async function deleteSuggestion(id: string, actor: Actor): Promise<void> {
  await loadOwned(id, actor)
  // deleteMany: a second delete of the same book is a no-op rather than an error.
  await prisma.longListBook.deleteMany({ where: { id } })
}

// Adds the user's vote, or removes it if they already had it. Returns whether it is now on.
export async function toggleLongListVote(bookId: string, userId: string): Promise<boolean> {
  const book = await prisma.longListBook.findUnique({ where: { id: bookId }, select: { id: true } })
  if (!book) throw new ValidationError(GONE)

  const removed = await prisma.longListVote.deleteMany({ where: { bookId, userId } })
  if (removed.count > 0) return false

  try {
    await prisma.longListVote.create({ data: { bookId, userId } })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // A double tap raced us to it: the vote is on either way.
      if (e.code === 'P2002') return true
      // The book was deleted between the check and the write.
      if (e.code === 'P2003') throw new ValidationError(GONE)
    }
    throw e
  }
  return true
}
