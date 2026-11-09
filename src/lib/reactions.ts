import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export const REACTIONS = ['laugh', 'heart', 'cry'] as const
export type ReactionKind = (typeof REACTIONS)[number]

// What the page is allowed to see: a count per kind and whether the viewer is one of them. Never who.
export type ReactionSummary = Record<ReactionKind, { count: number; mine: boolean }>

export function isReactionKind(kind: string): kind is ReactionKind {
  return (REACTIONS as readonly string[]).includes(kind)
}

export function summarizeReactions(rows: { kind: string; userId: string }[], viewerId: string): ReactionSummary {
  const summary = Object.fromEntries(REACTIONS.map((k) => [k, { count: 0, mine: false }])) as ReactionSummary
  for (const { kind, userId } of rows) {
    if (!isReactionKind(kind)) continue
    summary[kind].count++
    if (userId === viewerId) summary[kind].mine = true
  }
  return summary
}

// Adds the viewer's reaction, or removes it if they already had it. Returns whether it is now on.
export async function toggleReaction(postId: string, userId: string, kind: string): Promise<boolean> {
  if (!isReactionKind(kind)) throw new Error('Unknown reaction')

  const post = await prisma.post.findUniqueOrThrow({ where: { id: postId }, select: { sectionId: true } })
  const membership = await prisma.threadMembership.findUnique({
    where: { userId_sectionId: { userId, sectionId: post.sectionId } },
  })
  if (!membership) throw new Error('You must join this section before reacting')

  const removed = await prisma.postReaction.deleteMany({ where: { postId, userId, kind } })
  if (removed.count > 0) return false

  try {
    await prisma.postReaction.create({ data: { postId, userId, kind } })
  } catch (e) {
    // A double tap raced us to it: the reaction is on either way.
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e
  }
  return true
}
