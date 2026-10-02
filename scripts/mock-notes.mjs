// Dev helper: fills the threads you've unlocked with notes and replies from mock members,
// so you can see how other people's bubbles look next to your own.
//
//   npm run db:mock-notes            add mock members, notes and replies
//   npm run db:mock-notes -- --remove  delete them all again
//
// Mock members have a googleId starting with "mock-". Removing them also deletes every
// reply posted under a mock note, including any you wrote while testing.
import { PrismaClient } from '@prisma/client'

const MOCK_PREFIX = 'mock-'

const MEMBERS = [
  { key: 'june', name: 'June Hollis' },
  { key: 'marcus', name: 'Marcus Bell' },
  { key: 'priya', name: 'Priya Raman' },
]

// Each thread gets these notes. `by: 'you'` is posted as the real member viewing the page.
const THREAD = [
  {
    by: 'june',
    body: "I did not expect the opening to hit this hard. The way the chapters jump between people made it feel like the whole country was falling apart at once.",
    replies: [
      { by: 'marcus', body: 'Same. I had to put it down for a bit after the first stretch.' },
      { by: 'you', body: 'The jumps worked for me too. It felt like flipping through news reports.' },
      { by: 'priya', body: "And everyone thinks it's just a bad cold at first. That's what got me." },
    ],
  },
  {
    by: 'marcus',
    body: 'Who is everyone rooting for so far? I keep changing my mind.',
    replies: [{ by: 'june', body: 'Nobody yet. Ask me again in ten chapters.' }],
  },
  {
    by: 'priya',
    body: "Quick one: is anyone else reading the extended edition? I think my chapter numbers might be off from yours.\n\nLet me know before I post anything spoilery.",
    replies: [],
  },
]

const prisma = new PrismaClient()

async function remove() {
  const mockUsers = await prisma.user.findMany({ where: { googleId: { startsWith: MOCK_PREFIX } }, select: { id: true } })
  const ids = mockUsers.map((u) => u.id)
  if (ids.length === 0) {
    console.log('No mock members to remove.')
    return
  }
  const replies = await prisma.post.deleteMany({ where: { parentPost: { userId: { in: ids } } } })
  const posts = await prisma.post.deleteMany({ where: { userId: { in: ids } } })
  await prisma.threadMembership.deleteMany({ where: { userId: { in: ids } } })
  await prisma.readingProgress.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  console.log(`Removed ${ids.length} mock members and ${replies.count + posts.count} posts.`)
}

async function add() {
  const you = await prisma.user.findFirst({
    where: { NOT: { googleId: { startsWith: MOCK_PREFIX } } },
    orderBy: { createdAt: 'asc' },
  })
  if (!you) throw new Error('Sign in once first so there is a real member to show replies from.')

  const sections = await prisma.section.findMany({
    where: { memberships: { some: { userId: you.id } } },
    orderBy: [{ bookId: 'asc' }, { order: 'asc' }],
  })
  if (sections.length === 0) throw new Error(`${you.email} hasn't unlocked any threads yet.`)

  const users = { you }
  for (const member of MEMBERS) {
    users[member.key] = await prisma.user.upsert({
      where: { googleId: MOCK_PREFIX + member.key },
      update: {},
      create: { googleId: MOCK_PREFIX + member.key, email: `${member.key}@mock.example`, name: member.name },
    })
  }
  const mockIds = MEMBERS.map((m) => users[m.key].id)

  let created = 0
  for (const section of sections) {
    const already = await prisma.post.count({ where: { sectionId: section.id, userId: { in: mockIds } } })
    if (already > 0) continue

    for (const userId of mockIds) {
      await prisma.threadMembership.upsert({
        where: { userId_sectionId: { userId, sectionId: section.id } },
        update: {},
        create: { userId, sectionId: section.id },
      })
    }

    // Spread posts over the last few hours, oldest first.
    let minutesAgo = 6 * 60
    const at = () => new Date(Date.now() - (minutesAgo -= 17) * 60_000)
    for (const note of THREAD) {
      const parent = await prisma.post.create({
        data: { sectionId: section.id, userId: users[note.by].id, body: note.body, createdAt: at() },
      })
      created++
      for (const reply of note.replies) {
        await prisma.post.create({
          data: {
            sectionId: section.id,
            userId: users[reply.by].id,
            body: reply.body,
            parentPostId: parent.id,
            createdAt: at(),
          },
        })
        created++
      }
    }
  }
  console.log(`Added ${created} mock posts across ${sections.length} unlocked threads (viewing as ${you.email}).`)
}

try {
  await (process.argv.includes('--remove') ? remove() : add())
} finally {
  await prisma.$disconnect()
}
