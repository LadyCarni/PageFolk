// One-time helper: looks books up on Google Books and adds them to the Long List, credited to the
// admin (ADMIN_EMAIL), who must have signed in at least once.
//
//   node scripts/import-long-list.mjs --preview   look the books up and write a review file; changes nothing
//   node scripts/import-long-list.mjs --apply     add the reviewed books from that file
//
// Run with the env loaded, e.g. `npx dotenv -e .env -- node scripts/import-long-list.mjs --preview`.
// Set GOOGLE_BOOKS_API_KEY in .env (a free key with the Books API enabled); without one, Google
// often refuses with a 429 because keyless requests share a daily quota.
// Edit the review file between the two steps to fix a synopsis or genre, or set "skip": true.
// Books already on the Long List or among the club's books are skipped, as in the app.
import { readFileSync, writeFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'

const BOOKS = [
  ['The Nightingale', 'Kristin Hannah'],
  ['The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid'],
  ['The House in the Cerulean Sea', 'TJ Klune'],
  ['Pachinko', 'Min Jin Lee'],
  ['Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin'],
  ['Remarkably Bright Creatures', 'Shelby Van Pelt'],
  ['Dark Matter', 'Blake Crouch'],
  ['The Thursday Murder Club', 'Richard Osman'],
  ['The Midnight Library', 'Matt Haig'],
  ['The Lost Apothecary', 'Sarah Penner'],
]

const REVIEW_FILE = 'scripts/long-list-import.review.json'
const SYNOPSIS_MAX = 300 // LONG_LIST_SYNOPSIS_MAX in src/lib/limits.ts

// Google's category words that point to one of the app's genres (GENRES in src/lib/genres.ts).
// First match wins, so the more specific ones come first.
const GENRE_HINTS = [
  [/historical/i, 'Historical Fiction'],
  [/science fiction/i, 'Science Fiction'],
  [/fantasy/i, 'Fantasy'],
  [/thriller|suspense/i, 'Thriller'],
  [/mystery|detective|crime/i, 'Mystery'],
  [/romance/i, 'Romance'],
  [/horror/i, 'Horror'],
  [/literary/i, 'Literary Fiction'],
]

const normalise = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ')
const duplicateKey = (title, author) => `${normalise(title)}|${normalise(author)}`

function plainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// Publisher blurbs before the story: bestseller banners in capitals, award and book-club lines,
// and review quotes with their attributions. Dropped sentence by sentence from the front.
const BLURB = /bestseller|best seller|book club pick|copies sold|award|finalist|now a (major )?(film|motion picture|series)|coming soon|netflix|apple tv|edition|sunday times|new york times|“|"|—|^[^a-z]*$/i

function storyText(html) {
  const sentences = plainText(html).match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) ?? []
  let i = 0
  while (i < sentences.length && BLURB.test(sentences[i]) && i < sentences.length - 1) i++
  return sentences.slice(i).join('').trim()
}

// Whole sentences up to the limit; a first sentence that is already too long is cut at a word.
function shorten(text) {
  if (text.length <= SYNOPSIS_MAX) return text
  const sentences = text.match(/[^.!?]+[.!?]+["”’)]*\s*/g) ?? []
  let out = ''
  for (const sentence of sentences) {
    if ((out + sentence).trim().length > SYNOPSIS_MAX) break
    out += sentence
  }
  out = out.trim()
  if (out) return out
  const cut = text.slice(0, SYNOPSIS_MAX - 1)
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

function pickGenre(categories) {
  const joined = categories.join(' / ')
  return GENRE_HINTS.find(([pattern]) => pattern.test(joined))?.[1] ?? null
}

// Editions that carry someone else's text: study guides, bundles, graded readers and the like.
const NOT_THE_NOVEL = /summary|analysis|study guide|collection|box set|bundle|graded reader|workbook|trivia|sparknotes|cliffsnotes/i

function sameTitle(found, wanted) {
  const clean = (t) => normalise(t).replace(/[^a-z0-9 ]/g, '')
  return clean(found) === clean(wanted)
}

async function lookUp(title, author) {
  const q = encodeURIComponent(`intitle:${title} inauthor:${author}`)
  // Keyless requests share Google's daily quota with everyone else and often get 429s.
  const key = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : ''
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=20&printType=books&langRestrict=en${key}`)
  if (!res.ok) throw new Error(`Google Books ${res.status} for ${title}`)
  const items = ((await res.json()).items ?? []).map((item) => item.volumeInfo).filter(Boolean)
  // The novel itself, in English, with a description: same main title, the author among the
  // authors, and nothing in the title or subtitle that says it's a guide or a bundle.
  const lastName = normalise(author).split(' ').pop()
  const candidates = items.filter(
    (v) =>
      v.language === 'en' &&
      v.description &&
      sameTitle(v.title, title) &&
      (v.authors ?? []).some((a) => normalise(a).includes(lastName)) &&
      !NOT_THE_NOVEL.test(`${v.title} ${v.subtitle ?? ''}`) &&
      !NOT_THE_NOVEL.test(v.description.slice(0, 200)),
  )
  // Among those, the description with the most story once the blurbs are stripped.
  return candidates.sort((a, b) => storyText(b.description).length - storyText(a.description).length)[0] ?? null
}

async function preview() {
  const rows = []
  for (const [title, author] of BOOKS) {
    const info = await lookUp(title, author)
    const description = info?.description ? storyText(info.description) : ''
    const categories = info?.categories ?? []
    rows.push({
      title,
      author,
      matched: info ? `${info.title}${info.subtitle ? `: ${info.subtitle}` : ''} — ${(info.authors ?? []).join(', ')}` : null,
      categories,
      genre: pickGenre(categories),
      romance: categories.some((c) => /romance/i.test(c)),
      synopsis: shorten(description),
      fullDescriptionLength: description.length,
      skip: false,
    })
  }
  writeFileSync(REVIEW_FILE, `${JSON.stringify(rows, null, 2)}\n`)
  for (const r of rows) {
    console.log(`\n${r.title} — ${r.author}`)
    console.log(`  matched:    ${r.matched ?? 'NOTHING FOUND'}`)
    console.log(`  categories: ${r.categories.join('; ') || '(none)'}`)
    console.log(`  genre:      ${r.genre ?? '(none)'}${r.romance ? '   ⚠ romance' : ''}`)
    console.log(`  synopsis:   (${r.synopsis.length}/${r.fullDescriptionLength}) ${r.synopsis || '(none)'}`)
  }
  console.log(`\nWrote ${REVIEW_FILE}. Review it, then run with --apply.`)
}

async function apply() {
  const rows = JSON.parse(readFileSync(REVIEW_FILE, 'utf8'))
  const prisma = new PrismaClient()
  try {
    const email = process.env.ADMIN_EMAIL
    const admin = email && (await prisma.user.findUnique({ where: { email } }))
    if (!admin) throw new Error(`No user for ADMIN_EMAIL (${email ?? 'unset'}); sign in once first.`)

    const taken = new Set()
    for (const b of await prisma.longListBook.findMany({ select: { title: true, author: true } })) taken.add(duplicateKey(b.title, b.author))
    for (const b of await prisma.book.findMany({ select: { title: true, author: true } })) taken.add(duplicateKey(b.title, b.author))

    for (const r of rows) {
      const key = duplicateKey(r.title, r.author)
      if (r.skip) console.log(`skipped (marked skip): ${r.title}`)
      else if (taken.has(key)) console.log(`skipped (already there): ${r.title}`)
      else if (!r.synopsis.trim() || r.synopsis.length > SYNOPSIS_MAX) console.log(`skipped (synopsis empty or over ${SYNOPSIS_MAX}): ${r.title}`)
      else {
        await prisma.longListBook.create({
          data: { title: r.title.trim(), author: r.author.trim(), genre: r.genre, synopsis: r.synopsis.trim(), suggestedById: admin.id },
        })
        taken.add(key)
        console.log(`added: ${r.title}`)
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

const mode = process.argv[2]
if (mode === '--preview') await preview()
else if (mode === '--apply') await apply()
else {
  console.error('Use --preview or --apply')
  process.exit(1)
}
