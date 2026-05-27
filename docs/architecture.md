# Architecture

## Current Flow

```text
Landing screen
  -> user signs up or logs in with email + password
  -> account is stored in browser IndexedDB
  -> user uploads EPUB or PDF
  -> file blob is stored in browser IndexedDB
  -> library and recent books are rendered from local browser state
  -> user opens a book
  -> reader creates an object URL from the stored blob
  -> PDF or EPUB renderer displays pages inside the 16:9 book shell
  -> reading progress is written back to IndexedDB
```

## Reader Model

- The first open state is always the book cover.
- Only forward navigation is meaningful from the cover state.
- PDF files render through `pdfjs-dist`.
- EPUB files render through `epubjs`.
- A shared reader shell handles arrows, swipe-up close, recent-book resume, and page-turn sound.

## Read Mode

- Read Mode enters fullscreen when available.
- Read Mode requests a screen wake lock when supported.
- Read Mode presents OS-specific guidance for Focus or Do Not Disturb.
- Browser security rules prevent the app from directly turning on system Do Not Disturb.

## Deployment Model

- The app is safe to deploy on Vercel because it does not require server-side writable storage.
- User data lives in browser IndexedDB on the client.
- No database or blob store is required for the current version.

## Limitations Of The Current Model

- Accounts are local to one browser profile.
- Uploaded books do not sync across devices.
- Clearing browser storage removes the library.
- This is a local-first web experience, not yet a cloud-synced library platform.

## Future Cloud-Sync Path

To evolve this into a real cross-device product, add:

- Server-side auth
- A database for users and progress
- Blob or object storage for ebooks
- Access control around private libraries
- Sync conflict handling for last-read position
