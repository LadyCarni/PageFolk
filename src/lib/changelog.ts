export type ChangelogLine = { text: string; roadmap?: number }
export type ChangelogVersion = { version: string; date: string; lines: ChangelogLine[] }

// Newest first. Add a new entry at the top when something ships.
export const CHANGELOG: ChangelogVersion[] = [
  {
    version: '1.4',
    // Set to the real deploy date when this goes live.
    date: '2026-11-12',
    lines: [
      {
        text: "The Long List: suggest books the club might read, like the ones you'd enjoy, and sort or filter by genre",
        roadmap: 5,
      },
      { text: 'Bookshelf menu brings Our shelf and The Long List together' },
    ],
  },
  {
    version: '1.3',
    // Set to the real deploy date when this goes live.
    date: '2026-11-09',
    lines: [
      { text: "What's new: see what's coming up, suggest features, upvote ideas and read the changelog" },
      { text: 'React to notes and replies with laugh, heart or sad' },
      { text: 'Nav links spread across the full width on phones' },
    ],
  },
  {
    version: '1.2',
    date: '2026-11-08',
    lines: [{ text: 'Quick unlock card to jump ahead to a chapter or unlock everything' }],
  },
  {
    version: '1.1',
    date: '2026-10-25',
    lines: [
      { text: 'Books show a genre' },
      { text: 'Tap anywhere in an empty thread to start the conversation' },
      { text: 'The note box sizes itself properly on phones' },
    ],
  },
  {
    version: '1.0',
    date: '2026-10-24',
    lines: [
      { text: 'Chapter names on the progress card and thread cards' },
      { text: 'The admin can enter chapter names for each book' },
    ],
  },
]

// Numeric per dot part, so '1.10' is newer than '1.9'.
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function latestVersion(): string {
  return CHANGELOG[0].version
}

export function isNewerThan(version: string, lastSeen: string | null): boolean {
  return lastSeen === null || compareVersions(version, lastSeen) > 0
}

// Which version shipped each roadmap item. If a number appears twice, the oldest version wins.
export function shippedVersionByNumber(changelog: ChangelogVersion[] = CHANGELOG): Map<number, string> {
  const shipped = new Map<number, string>()
  for (const { version, lines } of [...changelog].reverse()) {
    for (const { roadmap } of lines) {
      if (roadmap !== undefined && !shipped.has(roadmap)) shipped.set(roadmap, version)
    }
  }
  return shipped
}

// "2026-11-08" → "November 8, 2026". Read as UTC so the day never shifts with the viewer's time zone.
export function formatVersionDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
