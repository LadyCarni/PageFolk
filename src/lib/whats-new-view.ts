import { prisma } from '@/lib/db'
import { CHANGELOG, isNewerThan, shippedVersionByNumber } from '@/lib/changelog'
import { canViewItem } from '@/lib/roadmap'

export type ItemStatusLabel = 'planned' | 'in_progress'
export type RoadmapCard = {
  id: string
  number: number
  title: string
  description: string
  status: ItemStatusLabel
  isMemberRequest: boolean
  votes: number
  votedByViewer: boolean
}
export type MyRequest = {
  id: string
  title: string
  display: { kind: 'review' } | { kind: 'roadmap' } | { kind: 'shipped'; version: string } | { kind: 'not_planned' }
}
export type ChangelogLineView = { text: string; itemId: string | null; isMemberRequest: boolean }
export type ChangelogVersionView = { version: string; date: string; isNew: boolean; lines: ChangelogLineView[] }
type Author = { id: string; name: string | null }
export type ThreadEntryView =
  | { kind: 'original'; author: Author; title: string; description: string; at: Date }
  | { kind: 'reply'; id: string; author: Author; body: string; at: Date }
  | { kind: 'event'; text: string; at: Date }
export type ItemThread = {
  id: string
  title: string
  isMemberRequest: boolean
  headerStatus: MyRequest['display'] | { kind: ItemStatusLabel }
  entries: ThreadEntryView[]
}
export type WhatsNewView = {
  roadmap: RoadmapCard[]
  myRequests: MyRequest[]
  changelog: ChangelogVersionView[]
  selected: ItemThread | null
}

function eventText(code: string, name: string | null): string {
  switch (code) {
    case 'approved':
      return `${name ?? 'The admin'} approved this`
    case 'planned':
      return 'Moved to Planned'
    case 'in_progress':
      return 'Moved to In progress'
    case 'not_planned':
      return 'Marked not planned'
    default:
      return code
  }
}

export async function getWhatsNewView(
  viewer: { id: string; isAdmin: boolean },
  lastSeenBefore: string | null,
  requestedItemId?: string,
): Promise<WhatsNewView> {
  const shipped = shippedVersionByNumber(CHANGELOG)
  const items = await prisma.roadmapItem.findMany({
    include: { _count: { select: { votes: true } }, votes: { where: { userId: viewer.id }, select: { userId: true } } },
  })
  const shippedVersion = (n: number | null) => (n === null ? undefined : shipped.get(n))

  const roadmap: RoadmapCard[] = items
    .filter((i) => (i.status === 'planned' || i.status === 'in_progress') && i.number !== null && !shippedVersion(i.number))
    .map((i) => ({
      id: i.id,
      number: i.number as number,
      title: i.title,
      description: i.description,
      status: i.status as ItemStatusLabel,
      isMemberRequest: i.isMemberRequest,
      votes: i._count.votes,
      votedByViewer: i.votes.length > 0,
      createdAt: i.createdAt,
    }))
    .sort(
      (a, b) =>
        Number(b.status === 'in_progress') - Number(a.status === 'in_progress') ||
        b.votes - a.votes ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    )
    .map(({ createdAt: _c, ...card }) => card)

  const displayFor = (i: (typeof items)[number]): MyRequest['display'] => {
    const version = shippedVersion(i.number)
    if (version) return { kind: 'shipped', version }
    if (i.status === 'review') return { kind: 'review' }
    if (i.status === 'not_planned') return { kind: 'not_planned' }
    return { kind: 'roadmap' }
  }

  const myRequests: MyRequest[] = items
    .filter((i) => i.isMemberRequest && i.authorId === viewer.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((i) => ({ id: i.id, title: i.title, display: displayFor(i) }))

  const byNumber = new Map(items.filter((i) => i.number !== null).map((i) => [i.number as number, i]))
  // On a first visit (nothing seen yet) only the newest version is tagged New, not the whole history.
  const changelog: ChangelogVersionView[] = CHANGELOG.map((v, index) => ({
    version: v.version,
    date: v.date,
    isNew: lastSeenBefore === null ? index === 0 : isNewerThan(v.version, lastSeenBefore),
    lines: v.lines.map((l) => {
      const item = l.roadmap === undefined ? undefined : byNumber.get(l.roadmap)
      return { text: l.text, itemId: item?.id ?? null, isMemberRequest: item?.isMemberRequest ?? false }
    }),
  }))

  let selected: ItemThread | null = null
  const item = requestedItemId ? items.find((i) => i.id === requestedItemId) : undefined
  if (item) {
    const version = shippedVersion(item.number)
    if (canViewItem(item, viewer, version !== undefined)) {
      const [author, entries] = await Promise.all([
        prisma.user.findUnique({ where: { id: item.authorId }, select: { id: true, name: true } }),
        prisma.roadmapEntry.findMany({
          where: { itemId: item.id },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true } } },
        }),
      ])
      const views: ThreadEntryView[] = [
        {
          kind: 'original',
          author: author ?? { id: item.authorId, name: null },
          title: item.originalTitle,
          description: item.originalDescription,
          at: item.createdAt,
        },
        ...entries.map((e): ThreadEntryView =>
          e.kind === 'reply'
            ? { kind: 'reply', id: e.id, author: e.author, body: e.body, at: e.createdAt }
            : { kind: 'event', text: eventText(e.body, e.author.name), at: e.createdAt },
        ),
      ]
      if (version) {
        const date = CHANGELOG.find((v) => v.version === version)!.date
        views.push({ kind: 'event', text: `Shipped in ${version}`, at: new Date(date) })
      }
      selected = {
        id: item.id,
        title: item.title,
        isMemberRequest: item.isMemberRequest,
        headerStatus: version
          ? { kind: 'shipped', version }
          : item.status === 'review'
            ? { kind: 'review' }
            : item.status === 'not_planned'
              ? { kind: 'not_planned' }
              : { kind: item.status as ItemStatusLabel },
        entries: views,
      }
    }
  }

  return { roadmap, myRequests, changelog, selected }
}
