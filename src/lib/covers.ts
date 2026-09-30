import { prisma } from '@/lib/db'
import { MAX_COVER_BYTES } from '@/lib/cover-limits'

export { MAX_COVER_BYTES }

const NOT_AN_IMAGE = 'Cover must be a PNG, JPEG, or WebP image'

// Detect the type from the file's own bytes, not its name or the browser-reported type.
function detectImageType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b)
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}

export async function setBookCover(bookId: string, bytes: Uint8Array): Promise<void> {
  if (bytes.byteLength > MAX_COVER_BYTES) {
    throw new Error(`Cover image must be ${MAX_COVER_BYTES / 1024} KB or smaller`)
  }
  const contentType = detectImageType(bytes)
  if (!contentType) {
    throw new Error(NOT_AN_IMAGE)
  }

  const data = Buffer.from(bytes)
  await prisma.bookCover.upsert({
    where: { bookId },
    create: { bookId, data, contentType },
    update: { data, contentType },
  })
}

export async function getBookCover(bookId: string) {
  return prisma.bookCover.findUnique({ where: { bookId } })
}

export async function removeBookCover(bookId: string): Promise<void> {
  await prisma.bookCover.deleteMany({ where: { bookId } })
}
