import type { Prisma, RoadmapItem } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ValidationError } from '@/lib/errors'
import { validateFeatureText } from '@/lib/limits'

export type RoadmapStatus = 'review' | 'planned' | 'in_progress' | 'not_planned'

function checkText(title: string, description: string) {
  const error = validateFeatureText(title, description)
  if (error) throw new ValidationError(error)
  return { title: title.trim(), description: description.trim() }
}

async function nextNumber(tx: Prisma.TransactionClient): Promise<number> {
  const top = await tx.roadmapItem.aggregate({ _max: { number: true } })
  return (top._max.number ?? 0) + 1
}

// Re-checked inside the transaction so a double click can't act on the same request twice.
async function requireReview(tx: Prisma.TransactionClient, itemId: string) {
  const item = await tx.roadmapItem.findUnique({ where: { id: itemId } })
  if (!item || item.status !== 'review') throw new ValidationError('This request has already been handled')
  return item
}

export async function submitRequest(authorId: string, title: string, description: string): Promise<RoadmapItem> {
  const text = checkText(title, description)
  return prisma.roadmapItem.create({
    data: {
      ...text,
      originalTitle: text.title,
      originalDescription: text.description,
      status: 'review',
      isMemberRequest: true,
      authorId,
    },
  })
}

export async function approveRequest(itemId: string, adminId: string, title: string, description: string): Promise<RoadmapItem> {
  const text = checkText(title, description)
  return prisma.$transaction(async (tx) => {
    await requireReview(tx, itemId)
    const number = await nextNumber(tx)
    const item = await tx.roadmapItem.update({ where: { id: itemId }, data: { ...text, status: 'planned', number } })
    await tx.roadmapEntry.create({ data: { itemId, authorId: adminId, kind: 'event', body: 'approved' } })
    return item
  })
}

export async function declineRequest(itemId: string, adminId: string, note: string): Promise<void> {
  const reply = note.trim()
  await prisma.$transaction(async (tx) => {
    await requireReview(tx, itemId)
    await tx.roadmapItem.update({ where: { id: itemId }, data: { status: 'not_planned' } })
    await tx.roadmapEntry.create({ data: { itemId, authorId: adminId, kind: 'event', body: 'not_planned' } })
    if (reply) await tx.roadmapEntry.create({ data: { itemId, authorId: adminId, kind: 'reply', body: reply } })
  })
}

export async function createAdminItem(adminId: string, title: string, description: string): Promise<RoadmapItem> {
  const text = checkText(title, description)
  return prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx)
    return tx.roadmapItem.create({
      data: {
        ...text,
        originalTitle: text.title,
        originalDescription: text.description,
        status: 'planned',
        isMemberRequest: false,
        number,
        authorId: adminId,
      },
    })
  })
}

export async function setItemStatus(
  itemId: string,
  adminId: string,
  status: 'planned' | 'in_progress' | 'not_planned',
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const item = await tx.roadmapItem.findUnique({ where: { id: itemId } })
    if (!item || (item.status !== 'planned' && item.status !== 'in_progress')) {
      throw new ValidationError('Only planned or in-progress items can change status')
    }
    if (item.status === status) return
    await tx.roadmapItem.update({ where: { id: itemId }, data: { status } })
    await tx.roadmapEntry.create({ data: { itemId, authorId: adminId, kind: 'event', body: status } })
  })
}

// Public wording only; the originals stay as first written.
export async function updateItem(itemId: string, title: string, description: string): Promise<void> {
  const text = checkText(title, description)
  await prisma.roadmapItem.update({ where: { id: itemId }, data: text })
}

export function pendingRequestCount(): Promise<number> {
  return prisma.roadmapItem.count({ where: { status: 'review' } })
}
