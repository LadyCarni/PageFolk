// One-time helper: adds the admin's starting roadmap items, as Planned, numbered after any
// existing items. Safe to run again: an item whose title is already on the roadmap is skipped.
//
//   npm run db:seed-roadmap
//
// The items are credited to the admin (ADMIN_EMAIL), who must have signed in at least once.
import { PrismaClient } from '@prisma/client'

const ITEMS = [
  {
    title: 'Notifications',
    description: [
      '• "A new post was made about chapters n to n" daily/weekly (options for cadence for the user)',
      "• Prompts for creating new threads of conversation, asking what chapter you've most recently finished (to update your chapter in the app, to unlock more threads).",
      '• A new vote is available.',
      '• You finished a book; leave a review.',
      '• Your thread got a new reply.',
    ].join('\n'),
  },
  {
    title: 'Rate Books',
    description:
      "With the option to either publicly or anonymously rate books that you've completed. No timestamps necessary.",
  },
  {
    title: 'Books coming up',
    description: 'Have the ability to both select multiple upcoming books and see them coming up somewhere in the UI',
  },
  {
    title: 'Vote on Next Books',
    description:
      'The members of the book club should have the ability to see a selection of books to vote on for the next book club. The admin would ultimately have to pick among the highest votes, or be the tie breaker.',
  },
]

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL is not set')
  const admins = await prisma.user.findMany({ select: { id: true, email: true } })
  const admin = admins.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!admin) throw new Error('The admin has not signed in yet, so there is no user to credit the items to')

  for (const { title, description } of ITEMS) {
    const existing = await prisma.roadmapItem.findFirst({ where: { title } })
    if (existing) {
      console.log(`skip   #${existing.number ?? '-'} ${title} (already there)`)
      continue
    }
    const item = await prisma.$transaction(async (tx) => {
      const { _max } = await tx.roadmapItem.aggregate({ _max: { number: true } })
      return tx.roadmapItem.create({
        data: {
          number: (_max.number ?? 0) + 1,
          title,
          description,
          originalTitle: title,
          originalDescription: description,
          status: 'planned',
          isMemberRequest: false,
          authorId: admin.id,
        },
      })
    })
    console.log(`added  #${item.number} ${title}`)
  }
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
