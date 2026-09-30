import { prisma } from '@/lib/db'

export async function createPost(sectionId: string, userId: string, body: string, parentPostId?: string) {
  const trimmed = body.trim()
  if (!trimmed) {
    throw new Error('Post body cannot be empty')
  }

  const membership = await prisma.threadMembership.findUnique({
    where: { userId_sectionId: { userId, sectionId } },
  })
  if (!membership) {
    throw new Error('You must join this section before posting')
  }

  return prisma.post.create({
    data: { sectionId, userId, body: trimmed, parentPostId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })
}

export async function deletePost(postId: string, userId: string): Promise<void> {
  const post = await prisma.post.findUniqueOrThrow({ where: { id: postId } })
  if (post.userId !== userId) {
    throw new Error('You can only delete your own posts')
  }

  // Collect the post and all of its descendants, level by level.
  const ids = [postId]
  let frontier = [postId]
  while (frontier.length > 0) {
    const children = await prisma.post.findMany({
      where: { parentPostId: { in: frontier } },
      select: { id: true },
    })
    frontier = children.map((c) => c.id)
    ids.push(...frontier)
  }

  await prisma.post.deleteMany({ where: { id: { in: ids } } })
}
