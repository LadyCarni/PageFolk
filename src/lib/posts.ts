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
