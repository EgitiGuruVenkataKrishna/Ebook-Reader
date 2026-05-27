# Ebook Reader

`Ebook Reader` is a Vercel-ready web app for reading uploaded `EPUB` and `PDF` files inside a tactile 16:9 book interface. It includes email-based signup and login, recent-books resume flow, page-turn sound, swipe-up close, and a Read Mode that guides users to enable Focus or Do Not Disturb on their device.

## Current Storage Model

This deployed version is `browser-local`, not cloud-synced.

- Accounts are stored in the user’s current browser.
- Uploaded books are stored in the user’s current browser on that device.
- Reading progress and recent books are stored in the same browser.
- Clearing browser storage, switching browsers, or switching devices will not carry the library over.

This model is what makes the app deploy cleanly to Vercel without needing a database or file-storage service.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- IndexedDB for browser-local persistence
- `pdfjs-dist` for PDF rendering
- `epubjs` for EPUB rendering
- Vercel deployment target

## Local Setup

```bash
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`.

PowerShell may block `npm.ps1`, so the commands above use `npm.cmd`.

## Features

- Email and password signup/login
- Local book import for `PDF` and `EPUB`
- Realistic 16:9 cover-first reading surface
- Left and right page-turn navigation
- Swipe-up gesture to close the reader
- Tap-to-continue on recently opened books
- Read Mode with fullscreen, wake lock, and OS-specific Focus guidance
- Coffee, brown, biscuit, and red-brown visual system across desktop and mobile

## Deployment To Vercel

1. Push this repository to GitHub.
2. Import the repository into Vercel as a Next.js project.
3. Deploy with the default settings.

No environment variables are required for the current browser-local version.

## Important Vercel Behavior

- Vercel only hosts the application shell and frontend code.
- User accounts and uploaded books are not stored on Vercel servers in this version.
- Each user keeps their own library inside their browser storage.
- This means the app works well as a shareable hosted experience, but not yet as a multi-device synced product.

## Verification

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## Next Production Step

If you want true multi-device sync later, add:

- A database for accounts and progress
- Object storage for uploaded books
- Real server-side auth and session management
- Optional encryption or private-library controls
