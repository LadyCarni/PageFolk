# What's new: roadmap, feature requests and changelog

Date: 2026-11-09
Mockups: `.superpowers/brainstorm/895132-1794230238/content/` (gitignored). `whats-new-page-v7.html` shows the page, `whats-new-thread-v8.html` shows an open thread, and `changelog-placement.html` shows option A (the one chosen).

## Why

PageFolk is live with a small group of testers. Caryn wants them to:

- see what's changed since they last looked,
- see what's coming next,
- suggest features and upvote the ones they want,
- see that their requests are read and acted on. This last one is the heart of it: a shipped request is marked as a member request so everyone sees ideas turn into features.

## Goals

- A **What's new** page in the main nav. It has the roadmap ("Coming up") at the top, the tester's own requests under that, and the Changelog below.
- A notification dot on the **What's new** nav item whenever a version has been published that the viewer hasn't seen.
- Testers can suggest features. Caryn reviews each one privately first, and only approved ones reach the roadmap.
- Testers can upvote roadmap items.
- Each roadmap item has a thread where Caryn explains decisions and changes. Anyone can read it, and only the admin can write in it.
- Requests that shipped are marked with a crown in the Changelog.
- An Admin dropdown with a **Feature requests** page, and a dot on Admin when requests are waiting for review.

## Non-goals (for now)

- Testers replying in roadmap threads. Only the admin posts.
- Reactions in roadmap threads.
- Email or push notifications. The dots are the only signal.
- Pulling roadmap items from GitHub issues. Caryn wants this later, as its own feature.
- An admin form for writing changelog entries. Claude writes them in code at deploy time.
- Hiding the requester's name. Names are shown to everyone.

## Anti-goals

- The page must not feel like a bug tracker. It should be warm and in PageFolk's style, with short lists and plain language.
- A tester must never see someone else's pending or declined request.
- The dot must not linger after the viewer has opened the page, and it must not depend on signing in again. Sessions last weeks.

## The page: What's new (`/whats-new`)

A new main nav item, labelled **What's new**, placed after Members and before Admin. Testers have 4 nav items and the admin has 5. Check that the phone nav row still fits at 375px width, and shorten a label if it doesn't.

### Layout (option A, decided)

The page is one centered column with the sections in this order: **Coming up**, **Your requests** and **Changelog**.

Picking a roadmap card (or one of your own requests) opens its thread in a right-hand panel on desktop. This works like the chapter thread panel: the selected card is highlighted, the left side keeps scrolling, and the Changelog stays in the left column. On phones the thread takes over the screen with a Back link, the same as chapter threads. The selected item should live in the URL (for example `/whats-new?item=<id>`), so a thread can be linked and Back works.

### Coming up (roadmap)

- **Section heading:** "Coming up", with a **Suggest a feature** outline button on the right.
- **Cards:** one per roadmap item with status Planned or In progress. Each card has:
  - **Upvote button** on the left, showing ▲ and the count. The viewer's own vote is highlighted gold and labelled "voted". Clicking again removes the vote. One vote per person per item.
  - **Title**, followed by the **Member request** badge (crown icon plus "Member request", in a gold-outline pill) if a tester suggested it.
  - **Status** in the card's top right corner as plain uppercase small text with no box. It has a colored dot before it:
    - **In progress:** rose text (`dustyRose`) with a green dot.
    - **Planned:** grey text (`mist`) with a gold dot (`antiqueGold`).
  - **Description**, one or two lines.
- **Suggest a feature form:** hidden until the button is tapped, then it appears inline under the heading. It contains:
  - a title input with the placeholder "What feature would you like to see?",
  - a description textarea with the placeholder "Describe what the feature does? What other apps have you used that has this feature, as an example?",
  - a gold **Submit Feature Request** button, with a **Cancel** text button next to it that closes the form,
  - a note under the buttons: "Every feature request is reviewed. Thank you for your idea!"

  After a successful submit, the form closes, the request appears in Your requests as Under review, and a short thank-you confirmation shows.

### Your requests

This section is shown only if the viewer has submitted at least one request. It lists their requests, newest first, each with its status:

| Status | Colour | When |
|---|---|---|
| Under review | grey | waiting for the admin |
| On the roadmap | gold | approved (Planned or In progress) |
| Shipped in X.Y | green | its changelog version is published |
| Not planned | dim grey | declined |

Each row opens that request's thread. Under review and Not planned threads are visible only to the requester and the admin.

### Changelog

- **Heading:** "Changelog". Directly under it, a legend chip: crown + "Member request".
- **Versions:** newest first. Each shows "Version X.Y", the date, and a rose **New** tag if it's newer than the version the viewer last saw. Below that is a short bullet list of changes in plain language.
- **Request lines:** a line that delivered a member request starts with the crown icon by itself, with no label text. It has a "Member request" tooltip and accessible label.
- **Version row:** no badge on the version heading row itself.
- **Clickable lines:** a line that delivered a roadmap item, whether a member request or one of the admin's own items, opens that item's thread in the panel. Anyone can open it, because shipped threads are public. Lines that didn't come from a roadmap item stay plain text.

### Thread panel (roadmap items and requests)

- **Header:** the item's current title, the Member request badge if it applies, and its status.
- **First entry:** the tester's original request, exactly as submitted (name, date, original title and description). If Caryn edited the wording when approving, the roadmap shows her version and the thread keeps theirs.
- **After that, in time order:**
  - Caryn's replies, shown in the existing note bubble style with an **Admin** tag.
  - Small grey event lines for each status change: "Caryn approved this", "Moved to In progress", "Marked not planned", "Shipped in 1.5".
- **Composer:** the admin sees a normal reply box. Everyone else sees "Only the admin replies here" in its place.
- **Admin's own items:** the first entry is just the admin's description, with no requester. These items carry no badge.

Reuse the existing note and bubble components where it's reasonable. Chapter posts (`Post`) belong to a `Section`, so roadmap threads need their own storage.

## Admin

### Nav

**Admin** becomes a dropdown menu with:

- **Books & club**: today's `/admin` page, unchanged.
- **Feature requests**: a new page, for example `/admin/feature-requests`.

A dot shows on the Admin nav item while any request is Under review. It clears when nothing is waiting. Opening the page doesn't clear it.

### Feature requests page

- **Waiting for review:** each request shows the tester's name, date, title and description, with two actions:
  - **Approve:** the title and description are editable first (pre-filled with the tester's text). The item goes onto the roadmap as Planned.
  - **Decline:** an optional note. The request becomes Not planned, and the note is posted as the admin's reply in its thread.
- **Roadmap:** the current items, where the admin can:
  - change status between Planned and In progress,
  - mark an item Not planned, which removes it from the roadmap,
  - edit the title and description,
  - add a new item of her own (title and description, starting as Planned).
- **Replying:** happens in the thread panel on the What's new page, not here.

## Changelog in code, and versions

- Changelog entries live in a source file, for example `src/lib/changelog.ts`, as a typed list with version, date and items. An item can reference the roadmap item it delivered.
- At each deploy, Claude adds a version entry summarizing the changes in plain language, and bumps the version.
- An item counts as **shipped** once a published changelog version references it. It then leaves Coming up, its requester sees "Shipped in X.Y", and an event line is added to its thread. Roadmap items are rows in the production database, so the reference must use the production ID. Claude can already reach the server over SSH during deploys (details in the gitignored `DEPLOY.local.md`). At deploy time, Claude looks up the delivered item's ID with a read-only query on the production database and writes it into the changelog entry. The admin does nothing by hand. *(Claude's call.)* The page should ignore a reference that doesn't match any row, without failing, so local development with `dev.db` still works.

## The What's new dot

- Store the latest version each user has seen, on the user (for example `lastSeenVersion`).
- The dot shows when the newest version in the changelog is newer than the user's stored version.
- Opening `/whats-new` records the newest version as seen, so the dot clears. Versions newer than the user's *previous* stored version still get the New tag on that visit.
- The dot is small and rose (`dustyRose`), at the top right of the nav label, with a ring in the nav background color. Its accessible label should be something like "What's new, new updates".

## Constraints

- Next.js App Router, Chakra UI, Prisma on SQLite, Auth.js (next-auth beta) JWT sessions. Follow the existing patterns, such as server actions and the `src/lib` helpers.
- Icons: the crown is `faCrown` from `@fortawesome/free-solid-svg-icons`, which is already a dependency.
- Use the colors from the `src/theme.ts` tokens. The green status dot is new and should be added as a token.
- `deploy/deploy.sh` runs `prisma db push`, so new tables arrive with the deploy. Use additive schema changes only.
- The repo is public, so keep server-specific details out of it.
- Testing follows the repo's existing test setup, with TDD for logic such as dot visibility, status derivation, vote toggling and visibility rules.

## Left to the builder

- Data model shape and names (requests, roadmap items, votes, thread entries, events).
- How shipped items in code are matched to database rows (see above).
- Exact spacing and typography, within the mockups' look.
- How the thread panel and selection are wired, reusing the chapter-thread pieces where that's sensible.
- Shortening nav labels on phones if they don't fit.

## Calls Claude made (not discussed with Caryn)

- The roadmap is sorted with In progress first, then by vote count, then newest.
- Requesters can upvote their own item. Nobody gets an automatic vote.
- Any signed-in member can submit any number of requests, with no rate limit.
- Brand-new members see the dot once, as an introduction to the page.
- The Admin dot shows while any request is waiting, rather than tracking whether the admin has seen them.
- The first published changelog is backfilled with a few entries for recent features.
