# Ebook Reader

**Ebook Reader** is a warm, tactile web reading experience for people who already have their own `EPUB` and `PDF` files and want to open them inside a beautiful, book-like interface instead of a flat document viewer.

It is designed to feel calm, focused, and physical:

- a cover-first opening experience
- a cinematic `16:9` reading stage
- left and right page turns
- recent-book resume
- page-turn sound
- a user-invoked Read Mode with Focus / Do Not Disturb guidance

## What It Feels Like

This is not a generic file viewer.

The app is built to make digital books feel more like something you *open* than something you merely *scroll through*. The visual language stays inside a coffee, brown, biscuit, and red-brown palette, and the reading surface is framed like a desk-ready book spread across both desktop and mobile.

## What Users Can Do

- Create an account with email and password
- Upload their own `PDF` and `EPUB` files
- Start from the book cover
- Turn pages using the left and right controls
- Reopen recent books and continue from the last saved page
- Swipe up to close the book and return to the shelf
- Enter Read Mode for a quieter, more immersive session

## How To Use It

### 1. Create your shelf

Sign up with an email and password. Once signed in, the app opens your personal shelf.

### 2. Import a book

Use the upload area to add a local `PDF` or `EPUB` file. The book appears in your library immediately.

### 3. Open from the cover

Every book begins at its cover. The first interaction is intentionally forward-moving, like opening a real book.

### 4. Read naturally

Use the right arrow to move deeper into the book and the left arrow to move back. The reading area keeps a wide, book-like composition rather than collapsing into a plain document frame.

### 5. Continue later

Recently opened books appear in a dedicated section. Tapping one resumes from the last saved page.

### 6. Enter Read Mode

When the user taps **Read Mode**, the app:

- enters fullscreen when supported
- requests a screen wake lock when supported
- shows the right Focus / Do Not Disturb instructions for the current device or OS

The app does **not** force system quiet mode directly. Instead, it guides the user to enable it intentionally.

## Storage Behavior

This version is intentionally **browser-local**.

That means:

- the user account is stored in the current browser
- uploaded books are stored in the current browser on that device
- reading progress is stored in the same place

It also means:

- switching browsers will not carry the library over
- switching devices will not carry the library over
- clearing browser storage will remove the saved shelf

This tradeoff is what makes the app easy to host as a clean web product without requiring cloud storage or a server-side book database.

## Best For

- readers who already download their own ebooks
- calm, focused reading sessions
- private, device-local personal libraries
- lightweight hosted deployment without backend complexity

## Experience Highlights

- Cover-first reading flow
- Realistic `16:9` book presentation
- EPUB and PDF support
- Tap-to-continue recent books
- Swipe-up close gesture
- Page-turn sound
- Read Mode with OS-aware guidance
- Desktop and mobile-friendly layout

## Important Product Note

This is a **hosted web app with local browser storage**, not yet a cloud-synced ebook platform.

So the product is excellent for:

- personal use
- demos
- lightweight deployment
- local-first reading

It is **not yet** designed for:

- shared cloud libraries
- cross-device syncing
- account recovery across browsers
- server-side ebook storage

## Future Direction

If this grows into a fuller platform later, the next layer would be:

- real cloud authentication
- encrypted or private library storage
- cross-device sync
- account recovery
- server-side progress persistence

For now, the product stays intentionally simple: open your book, read beautifully, and come back exactly where you left off on the same device.
