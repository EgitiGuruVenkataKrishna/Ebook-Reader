"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Import,
  MoonStar,
  RefreshCcw,
  Volume2,
  X
} from "lucide-react";
import type { BookRecord, SessionUser } from "@/lib/ebook/types";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

type AuthResponse =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string };

type BooksResponse =
  | { ok: true; books: BookRecord[] }
  | { ok: false; error: string };

type UploadResponse =
  | { ok: true; book: BookRecord }
  | { ok: false; error: string };

type ProgressResponse =
  | { ok: true; book: BookRecord | null }
  | { ok: false; error: string };

type ReadModeGuide = {
  label: string;
  title: string;
  steps: string[];
};

export function EbookReaderApp() {
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<SessionUser | null>(null);
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [readerBook, setReaderBook] = useState<BookRecord | null>(null);
  const [readerPage, setReaderPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readModeEnabled, setReadModeEnabled] = useState(false);
  const [readModeGuide, setReadModeGuide] = useState<ReadModeGuide | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [readerMounted, setReaderMounted] = useState(false);
  const wakeLockRef = useRef<{ release?: () => Promise<void> } | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerShellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedSession = window.localStorage.getItem("ebook-reader-session");

    if (!savedSession) {
      return;
    }

    try {
      setSession(JSON.parse(savedSession) as SessionUser);
    } catch {
      window.localStorage.removeItem("ebook-reader-session");
    }
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadBooks(session.email);
  }, [session]);

  useEffect(() => {
    if (!readerBook || !session) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveProgress(session.email, readerBook.id, readerPage);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [readerBook, readerPage, session]);

  useEffect(() => {
    return () => {
      void disableReadMode();
    };
  }, []);

  const recentBooks = useMemo(() => {
    return books
      .filter((book) => book.currentPage > 0)
      .sort((left, right) => {
        return new Date(right.lastOpenedAt).getTime() - new Date(left.lastOpenedAt).getTime();
      })
      .slice(0, 3);
  }, [books]);

  const activePageLabel = readerPage === 0 ? "Cover" : `Page ${readerPage}`;
  const canGoLeft = readerPage > 0;
  const canGoRight = !readerBook ? false : totalPages === 0 || readerPage < totalPages;

  async function loadBooks(userEmail: string) {
    setError(null);

    const response = await fetch(`/api/books?email=${encodeURIComponent(userEmail)}`);
    const payload = (await response.json()) as BooksResponse;

    if (!payload.ok) {
      setError(payload.error);
      return;
    }

    setBooks(payload.books);
  }

  async function handleAuthSubmit() {
    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const endpoint = authMode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = (await response.json()) as AuthResponse;

      if (!payload.ok) {
        throw new Error(payload.error);
      }

      window.localStorage.setItem("ebook-reader-session", JSON.stringify(payload.user));
      setSession(payload.user);
      setMessage(
        authMode === "signup"
          ? "Account created and saved to your local workbook."
          : "Welcome back to your shelf."
      );
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !session) {
      return;
    }

    setIsUploading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("email", session.email);
      formData.set("file", file);

      const response = await fetch("/api/books", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as UploadResponse;

      if (!payload.ok) {
        throw new Error(payload.error);
      }

      setBooks((current) => [payload.book, ...current]);
      setMessage(`${payload.book.title} was saved locally on this device.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function saveProgress(userEmail: string, bookId: string, currentPage: number) {
    const response = await fetch("/api/books/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail, bookId, currentPage })
    });
    const payload = (await response.json()) as ProgressResponse;

    if (!payload.ok || !payload.book) {
      return;
    }

    setBooks((current) =>
      current.map((book) => {
        return book.id === payload.book?.id ? payload.book : book;
      })
    );
  }

  function openBook(book: BookRecord, mode: "cover" | "continue") {
    setReaderBook(book);
    setReaderPage(mode === "continue" ? book.currentPage : 0);
    setTotalPages(book.totalPagesHint);
    setReaderMounted(true);
    setMessage(null);
  }

  async function closeReader() {
    setReaderMounted(false);
    setReaderBook(null);
    setReaderPage(0);
    setReadModeGuide(null);
    await disableReadMode();
  }

  async function enableReadMode() {
    setReadModeEnabled(true);

    if (document.fullscreenEnabled && readerShellRef.current && !document.fullscreenElement) {
      try {
        await readerShellRef.current.requestFullscreen();
      } catch {
        // Fullscreen is helpful but optional.
      }
    }

    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch {
        wakeLockRef.current = null;
      }
    }

    setReadModeGuide(resolveReadModeGuide());
  }

  async function disableReadMode() {
    setReadModeEnabled(false);

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore cleanup failures.
      }
    }

    if (wakeLockRef.current?.release) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore cleanup failures.
      } finally {
        wakeLockRef.current = null;
      }
    }
  }

  function playPageTurn() {
    if (!soundEnabled) {
      return;
    }

    const AudioContextCtor =
      window.AudioContext ||
      // @ts-expect-error Safari fallback.
      window.webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const context = new AudioContextCtor();
    const now = context.currentTime;
    const noiseBuffer = context.createBuffer(1, context.sampleRate * 0.18, context.sampleRate);
    const channel = noiseBuffer.getChannelData(0);

    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * Math.exp((-4 * index) / channel.length);
    }

    const source = context.createBufferSource();
    source.buffer = noiseBuffer;

    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 920;
    filter.Q.value = 0.6;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(now);
    source.stop(now + 0.19);
    void source.onended;
  }

  function goToNextPage() {
    if (!canGoRight) {
      return;
    }

    playPageTurn();
    setReaderPage((current) => current + 1);
  }

  function goToPreviousPage() {
    if (!canGoLeft) {
      return;
    }

    playPageTurn();
    setReaderPage((current) => Math.max(0, current - 1));
  }

  function handleSwipeStart(clientY: number) {
    swipeStartY.current = clientY;
  }

  function handleSwipeEnd(clientY: number) {
    if (swipeStartY.current === null) {
      return;
    }

    const delta = swipeStartY.current - clientY;
    swipeStartY.current = null;

    if (delta >= 80) {
      void closeReader();
    }
  }

  function logout() {
    window.localStorage.removeItem("ebook-reader-session");
    setSession(null);
    setBooks([]);
    setReaderBook(null);
    setReaderPage(0);
    setMessage("Signed out from this device.");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(164,92,68,0.22),transparent_32%),linear-gradient(180deg,#f3e5d0_0%,#e1c7a8_100%)] px-4 py-5 text-[#3d241b] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[30px] border border-[#8b5a46]/30 bg-[#5a392d]/92 px-5 py-5 text-[#f3e5d0] shadow-[0_30px_80px_rgba(53,29,22,0.28)] sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7b899]/25 bg-[#f3e5d0]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#f0d2bb]">
                <BookOpen className="h-3.5 w-3.5" />
                Ebook Reader
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#fff5e7] sm:text-5xl [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                Your shelf, your pace, your quiet.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#f0d2bb] sm:text-base">
                Import local EPUB or PDF books, open them inside a tactile 16:9 reader, continue
                from recent sessions, and step into Read Mode whenever you want a calmer space.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Pill label="Storage" value="Local only" />
              <Pill label="Read Mode" value="Focus prompt" />
              <Pill label="Format" value="EPUB + PDF" />
              <Pill label="Sound" value={soundEnabled ? "On" : "Muted"} />
            </div>
          </div>
        </header>

        {!session ? (
          <section className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
            <div className="rounded-[28px] border border-[#8b5a46]/25 bg-[#fff3e0]/92 p-6 shadow-[0_24px_70px_rgba(82,50,35,0.16)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8d4f39]">
                    Access
                  </div>
                  <h2 className="mt-2 text-3xl text-[#4e342e] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                    {authMode === "signup" ? "Create your shelf" : "Open your shelf"}
                  </h2>
                </div>
                <button
                  className="rounded-full border border-[#8d4f39]/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8d4f39] transition hover:bg-[#8d4f39] hover:text-[#fff3e0]"
                  onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}
                  type="button"
                >
                  {authMode === "signup" ? "Log in" : "Sign up"}
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <Field label="Email">
                  <input
                    className="h-12 w-full rounded-2xl border border-[#b48972]/35 bg-[#fffbf6] px-4 text-sm text-[#4e342e] outline-none transition focus:border-[#8d4f39] focus:ring-4 focus:ring-[#8d4f39]/15"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="reader@example.com"
                    type="email"
                    value={email}
                  />
                </Field>

                <Field label="Password">
                  <input
                    className="h-12 w-full rounded-2xl border border-[#b48972]/35 bg-[#fffbf6] px-4 text-sm text-[#4e342e] outline-none transition focus:border-[#8d4f39] focus:ring-4 focus:ring-[#8d4f39]/15"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimum 8 characters"
                    type="password"
                    value={password}
                  />
                </Field>

                {message ? <Notice tone="success">{message}</Notice> : null}
                {error ? <Notice tone="error">{error}</Notice> : null}

                <button
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#8d4f39] px-5 text-sm font-semibold text-[#fff3e0] transition hover:bg-[#704034] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy || !email || !password}
                  onClick={handleAuthSubmit}
                  type="button"
                >
                  {isBusy ? "Saving your shelf..." : authMode === "signup" ? "Create account" : "Log in"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureCard
                eyebrow="Reader"
                title="16:9 book stage"
                body="Every book opens inside a cinematic desk-like frame with realistic paper depth, arrow-based page turns, and a swipe-up exit gesture."
              />
              <FeatureCard
                eyebrow="Read Mode"
                title="Quiet by choice"
                body="When a reader taps Read Mode, the app shifts into fullscreen, keeps the screen awake, and shows the right Focus or Do Not Disturb guidance for the detected OS."
              />
              <FeatureCard
                eyebrow="Storage"
                title="Everything stays local"
                body="Accounts live in a local Excel workbook, and uploaded books stay in device-local folders rather than a cloud shelf."
              />
              <FeatureCard
                eyebrow="Flow"
                title="Continue where you stopped"
                body="Recent books appear on the home shelf and reopen at the last saved page with a single tap."
              />
            </div>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-5 rounded-[28px] border border-[#8b5a46]/25 bg-[#fff3e0]/94 p-5 shadow-[0_24px_70px_rgba(82,50,35,0.16)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8d4f39]">
                    Signed in
                  </div>
                  <h2 className="mt-2 break-all text-xl text-[#4e342e] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                    {session.email}
                  </h2>
                </div>
                <button
                  className="rounded-full border border-[#8d4f39]/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8d4f39] transition hover:bg-[#8d4f39] hover:text-[#fff3e0]"
                  onClick={logout}
                  type="button"
                >
                  Log out
                </button>
              </div>

              <div className="rounded-[24px] border border-dashed border-[#8d4f39]/25 bg-[#f7e8d4] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#6a4235]">
                  <Import className="h-4 w-4" />
                  Import an ebook
                </div>
                <p className="mt-2 text-sm leading-6 text-[#7a5547]">
                  Upload a local `PDF` or `EPUB`. The file stays on this device and is added to
                  your shelf immediately.
                </p>
                <input
                  accept=".pdf,.epub,application/pdf,application/epub+zip"
                  className="hidden"
                  onChange={handleUpload}
                  ref={fileInputRef}
                  type="file"
                />
                <button
                  className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-[#5a392d] px-4 text-sm font-semibold text-[#fff3e0] transition hover:bg-[#4e342e] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  {isUploading ? "Saving locally..." : "Choose file"}
                </button>
              </div>

              <div className="rounded-[24px] border border-[#8d4f39]/18 bg-[#f8ead7] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-[#6a4235]">Reader preferences</div>
                  <button
                    className="rounded-full border border-[#8d4f39]/25 p-2 text-[#8d4f39] transition hover:bg-[#8d4f39] hover:text-[#fff3e0]"
                    onClick={() => setSoundEnabled((current) => !current)}
                    type="button"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid gap-3">
                  <PreferenceRow
                    label="Page-turn sound"
                    value={soundEnabled ? "Enabled" : "Muted"}
                  />
                  <PreferenceRow
                    label="Read Mode"
                    value="Fullscreen + OS guidance"
                  />
                  <PreferenceRow label="Storage" value="Workbook + local folders" />
                </div>
              </div>

              {message ? <Notice tone="success">{message}</Notice> : null}
              {error ? <Notice tone="error">{error}</Notice> : null}
            </aside>

            <div className="grid gap-6">
              <section className="rounded-[28px] border border-[#8b5a46]/25 bg-[#fff7ec]/94 p-5 shadow-[0_24px_70px_rgba(82,50,35,0.16)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8d4f39]">
                      Recently opened
                    </div>
                    <h3 className="mt-2 text-2xl text-[#4e342e] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                      Tap to continue
                    </h3>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-[#8d4f39]/25 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#8d4f39] transition hover:bg-[#8d4f39] hover:text-[#fff3e0]"
                    onClick={() => session && void loadBooks(session.email)}
                    type="button"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {recentBooks.length > 0 ? (
                    recentBooks.map((book) => (
                      <BookCard
                        book={book}
                        cta="Continue reading"
                        key={book.id}
                        onOpen={() => openBook(book, "continue")}
                        progressLabel={book.currentPage > 0 ? `Resume at page ${book.currentPage}` : "Open cover"}
                      />
                    ))
                  ) : (
                    <EmptyShelf
                      title="No recent reading yet"
                      body="Open a book once and it will return here as a one-tap continue card."
                    />
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-[#8b5a46]/25 bg-[#fff7ec]/94 p-5 shadow-[0_24px_70px_rgba(82,50,35,0.16)]">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8d4f39]">
                    Library
                  </div>
                  <h3 className="mt-2 text-2xl text-[#4e342e] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                    Your local books
                  </h3>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {books.length > 0 ? (
                    books.map((book) => (
                      <BookCard
                        book={book}
                        cta="Open cover"
                        key={book.id}
                        onOpen={() => openBook(book, "cover")}
                        progressLabel={
                          book.currentPage > 0 ? `Last saved page ${book.currentPage}` : "Not started"
                        }
                      />
                    ))
                  ) : (
                    <EmptyShelf
                      title="Your shelf is waiting"
                      body="Import a PDF or EPUB from the panel on the left to start building your offline library."
                    />
                  )}
                </div>
              </section>
            </div>
          </section>
        )}
      </div>

      {readerMounted && readerBook && session ? (
        <div className="fixed inset-0 z-50 bg-[rgba(46,23,16,0.72)] p-3 sm:p-6">
          <div
            className="mx-auto flex h-full max-w-7xl flex-col rounded-[30px] border border-[#c79c7d]/25 bg-[#3a231c]/98 p-4 text-[#f8ead7] shadow-[0_30px_120px_rgba(18,9,7,0.55)]"
            onTouchEnd={(event) => handleSwipeEnd(event.changedTouches[0]?.clientY ?? 0)}
            onTouchStart={(event) => handleSwipeStart(event.touches[0]?.clientY ?? 0)}
            ref={readerShellRef}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c79c7d]/20 pb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d7b899]">
                  Swipe up to close
                </div>
                <h3 className="mt-2 text-2xl text-[#fff5e7] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
                  {readerBook.title}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusChip label={readerBook.format.toUpperCase()} />
                <StatusChip label={activePageLabel} />
                <button
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                    readModeEnabled
                      ? "bg-[#d7b899] text-[#4e342e]"
                      : "border border-[#d7b899]/25 bg-[#5a392d] text-[#fff3e0] hover:bg-[#704034]"
                  )}
                  onClick={() => {
                    void (readModeEnabled ? disableReadMode() : enableReadMode());
                  }}
                  type="button"
                >
                  <MoonStar className="h-4 w-4" />
                  {readModeEnabled ? "Exit Read Mode" : "Read Mode"}
                </button>
                <button
                  className="rounded-full border border-[#d7b899]/25 p-2 text-[#fff3e0] transition hover:bg-[#704034]"
                  onClick={() => void closeReader()}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center gap-3 py-4 sm:gap-5">
              <button
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-full border text-[#fff3e0] transition sm:h-14 sm:w-14",
                  canGoLeft
                    ? "border-[#d7b899]/30 bg-[#5a392d] hover:bg-[#704034]"
                    : "cursor-not-allowed border-[#8b5a46]/20 bg-[#4a2f26]/60 text-[#a48173]"
                )}
                disabled={!canGoLeft}
                onClick={goToPreviousPage}
                type="button"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="flex w-full max-w-5xl justify-center">
                <ReaderSurface
                  book={readerBook}
                  currentPage={readerPage}
                  email={session.email}
                  onPageChange={setReaderPage}
                  onTotalPagesChange={setTotalPages}
                />
              </div>

              <button
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-full border text-[#fff3e0] transition sm:h-14 sm:w-14",
                  canGoRight
                    ? "border-[#d7b899]/30 bg-[#8d4f39] hover:bg-[#a75d43]"
                    : "cursor-not-allowed border-[#8b5a46]/20 bg-[#4a2f26]/60 text-[#a48173]"
                )}
                disabled={!canGoRight}
                onClick={goToNextPage}
                type="button"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {readModeGuide ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(34,18,13,0.56)] px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-[#8d4f39]/25 bg-[#fff4e2] p-6 text-[#4e342e] shadow-[0_24px_80px_rgba(48,25,18,0.28)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#8d4f39]/20 bg-[#f7e5d2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#8d4f39]">
              <MoonStar className="h-3.5 w-3.5" />
              Read Mode
            </div>
            <h4 className="mt-4 text-3xl text-[#4e342e] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
              {readModeGuide.title}
            </h4>
            <p className="mt-3 text-sm leading-6 text-[#704034]">
              This browser build can open a calm reading state and guide you, but it cannot switch
              system Do Not Disturb on by itself. Follow the steps for {readModeGuide.label}.
            </p>
            <div className="mt-4 rounded-[22px] border border-[#8d4f39]/18 bg-[#f8ead7] p-4">
              <ol className="space-y-3 text-sm leading-6 text-[#6a4235]">
                {readModeGuide.steps.map((step, index) => (
                  <li className="flex gap-3" key={step}>
                    <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-[#8d4f39] text-xs font-semibold text-[#fff3e0]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-full border border-[#8d4f39]/25 px-4 py-2 text-sm font-semibold text-[#8d4f39] transition hover:bg-[#f5dfc7]"
                onClick={() => setReadModeGuide(null)}
                type="button"
              >
                Keep reading
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ReaderSurface({
  book,
  currentPage,
  email,
  onPageChange,
  onTotalPagesChange
}: {
  book: BookRecord;
  currentPage: number;
  email: string;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (count: number) => void;
}) {
  if (currentPage === 0) {
    return (
      <div className="aspect-video w-full max-w-5xl rounded-[26px] border border-[#d7b899]/20 bg-[linear-gradient(180deg,#d8b18c_0%,#8d4f39_100%)] p-3 shadow-[0_24px_80px_rgba(15,7,5,0.38)]">
        <div className="flex h-full flex-col justify-between rounded-[22px] border border-[#fff2df]/22 bg-[linear-gradient(135deg,rgba(255,245,231,0.18),rgba(255,245,231,0.02))] p-6 text-[#fff7ec]">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f4dbc3]">
            Cover
          </div>
          <div>
            <div className="max-w-xl text-4xl leading-tight tracking-[-0.05em] sm:text-5xl [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
              {book.title}
            </div>
            <div className="mt-4 text-sm uppercase tracking-[0.24em] text-[#f1d1b4]">
              {book.author}
            </div>
          </div>
          <div className="flex items-end justify-between text-sm text-[#f4dbc3]">
            <span>{book.format.toUpperCase()}</span>
            <span>Right arrow to begin</span>
          </div>
        </div>
      </div>
    );
  }

  return book.format === "pdf" ? (
    <PdfSurface
      book={book}
      currentPage={currentPage}
      email={email}
      onPageChange={onPageChange}
      onTotalPagesChange={onTotalPagesChange}
    />
  ) : (
    <EpubSurface
      book={book}
      currentPage={currentPage}
      email={email}
      onPageChange={onPageChange}
      onTotalPagesChange={onTotalPagesChange}
    />
  );
}

function PdfSurface({
  book,
  currentPage,
  email,
  onPageChange,
  onTotalPagesChange
}: {
  book: BookRecord;
  currentPage: number;
  email: string;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (count: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<unknown>(null);

  useEffect(() => {
    let disposed = false;

    async function loadDocument() {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const loadingTask = pdfjs.getDocument(`/api/books/file/${book.id}?email=${encodeURIComponent(email)}`);
      const pdf = await loadingTask.promise;

      if (disposed) {
        return;
      }

      pdfRef.current = pdf;
      onTotalPagesChange(pdf.numPages);
    }

    void loadDocument();

    return () => {
      disposed = true;
      pdfRef.current = null;
    };
  }, [book.id, email, onTotalPagesChange]);

  useEffect(() => {
    let disposed = false;

    async function renderPage() {
      const canvas = canvasRef.current;
      const pdf = pdfRef.current as
        | {
            getPage: (pageNumber: number) => Promise<{
              getViewport: (params: { scale: number }) => { width: number; height: number };
              render: (params: {
                canvasContext: CanvasRenderingContext2D;
                viewport: { width: number; height: number };
              }) => { promise: Promise<void> };
            }>;
            numPages: number;
          }
        | null;

      if (!canvas || !pdf) {
        return;
      }

      const safePage = Math.min(Math.max(currentPage, 1), pdf.numPages);

      if (safePage !== currentPage) {
        onPageChange(safePage);
        return;
      }

      const page = await pdf.getPage(safePage);
      const viewport = page.getViewport({ scale: 1.3 });
      const context = canvas.getContext("2d");

      if (!context || disposed) {
        return;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
    }

    void renderPage();

    return () => {
      disposed = true;
    };
  }, [currentPage, onPageChange]);

  return (
    <div className="ebook-book-frame aspect-video w-full max-w-5xl">
      <div className="ebook-book-spread">
        <div className="ebook-book-gutter" />
        <div className="ebook-page-panel justify-center p-3">
          <canvas className="h-full w-full rounded-[18px] object-contain" ref={canvasRef} />
        </div>
        <div className="ebook-page-panel hidden border-l border-[#d7b899]/12 md:flex">
          <div className="flex h-full flex-col justify-between rounded-[18px] bg-[#f6ead9] p-6 text-[#6a4235]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8d4f39]">
              Reading desk
            </div>
            <p className="text-sm leading-7">
              Use the arrow keys beside the book to turn pages. Swipe up on touch devices to close
              the reader and return to your shelf.
            </p>
            <div className="text-xs uppercase tracking-[0.22em] text-[#8d4f39]">
              Local PDF render
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EpubSurface({
  book,
  currentPage,
  email,
  onPageChange,
  onTotalPagesChange
}: {
  book: BookRecord;
  currentPage: number;
  email: string;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (count: number) => void;
}) {
  type EpubRendition = {
    display: (target?: string) => Promise<void>;
    destroy?: () => void;
    on: (event: string, callback: (location: { start?: { cfi?: string } }) => void) => void;
  };

  type EpubBook = {
    ready: Promise<void>;
    locations: {
      total?: number;
      cfiFromLocation?: (location: number) => string | null;
      locationFromCfi?: (cfi: string) => number;
      generate?: (size: number) => Promise<void>;
    };
    renderTo: (target: HTMLElement, options: Record<string, unknown>) => EpubRendition;
    destroy?: () => void;
  };

  const containerRef = useRef<HTMLDivElement | null>(null);
  const renditionRef = useRef<EpubRendition | null>(null);
  const bookRef = useRef<EpubBook | null>(null);

  useEffect(() => {
    let disposed = false;

    async function setup() {
      const epubModule = await import("epubjs");
      const createBook = (epubModule.default ?? epubModule) as (url: string) => EpubBook;

      if (!containerRef.current) {
        return;
      }

      containerRef.current.innerHTML = "";

      const epubBook = createBook(`/api/books/file/${book.id}?email=${encodeURIComponent(email)}`);
      bookRef.current = epubBook;
      await epubBook.ready;
      await epubBook.locations.generate?.(900);

      if (disposed || !containerRef.current) {
        return;
      }

      onTotalPagesChange(Math.max(1, epubBook.locations.total ?? 1));

      const rendition = epubBook.renderTo(containerRef.current, {
        width: "100%",
        height: "100%",
        spread: "none",
        flow: "paginated"
      });

      renditionRef.current = rendition;
      rendition.on("relocated", (location) => {
        const cfi = location.start?.cfi;

        if (!cfi) {
          return;
        }

        const pageNumber = Math.max(1, (epubBook.locations.locationFromCfi?.(cfi) ?? 0) + 1);
        onPageChange(pageNumber);
      });

      await rendition.display();
    }

    void setup();

    return () => {
      disposed = true;
      renditionRef.current?.destroy?.();
      bookRef.current?.destroy?.();
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [book.id, email, onPageChange, onTotalPagesChange]);

  useEffect(() => {
    const rendition = renditionRef.current;
    const epubBook = bookRef.current;

    if (!rendition || !epubBook || currentPage <= 0) {
      return;
    }

    const cfi = epubBook.locations.cfiFromLocation?.(Math.max(0, currentPage - 1));

    if (!cfi) {
      return;
    }

    void rendition.display(cfi);
  }, [currentPage]);

  return (
    <div className="ebook-book-frame aspect-video w-full max-w-5xl">
      <div className="ebook-book-spread">
        <div className="ebook-book-gutter" />
        <div className="ebook-page-panel p-4">
          <div className="h-full w-full overflow-hidden rounded-[18px] bg-[#fffaf2]" ref={containerRef} />
        </div>
        <div className="ebook-page-panel hidden border-l border-[#d7b899]/12 md:flex">
          <div className="flex h-full flex-col justify-between rounded-[18px] bg-[#f6ead9] p-6 text-[#6a4235]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8d4f39]">
              EPUB layout
            </div>
            <p className="text-sm leading-7">
              EPUB pages flow inside a paginated spread so the reading experience still feels like
              a book instead of a plain document viewer.
            </p>
            <div className="text-xs uppercase tracking-[0.22em] text-[#8d4f39]">
              Local EPUB render
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#d7b899]/18 bg-[#fff5e7]/8 px-3 py-3 text-center">
      <div className="text-lg font-semibold text-[#fff5e7]">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e9c8ad]">
        {label}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#8d4f39]">
        {label}
      </span>
      {children}
    </label>
  );
}

function FeatureCard({
  body,
  eyebrow,
  title
}: {
  body: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <article className="rounded-[28px] border border-[#8b5a46]/22 bg-[#fff7ec]/94 p-5 shadow-[0_18px_50px_rgba(82,50,35,0.12)]">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8d4f39]">{eyebrow}</div>
      <h3 className="mt-3 text-2xl text-[#4e342e] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-[#704034]">{body}</p>
    </article>
  );
}

function PreferenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#8d4f39]/12 bg-[#fff4e2] px-3 py-2 text-sm">
      <span className="text-[#704034]">{label}</span>
      <span className="font-semibold text-[#4e342e]">{value}</span>
    </div>
  );
}

function BookCard({
  book,
  cta,
  onOpen,
  progressLabel
}: {
  book: BookRecord;
  cta: string;
  onOpen: () => void;
  progressLabel: string;
}) {
  return (
    <button
      className="group rounded-[24px] border border-[#8b5a46]/16 bg-[#fcf2e3] p-4 text-left shadow-[0_14px_40px_rgba(82,50,35,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(82,50,35,0.14)]"
      onClick={onOpen}
      type="button"
    >
      <div className="rounded-[20px] bg-[linear-gradient(135deg,#6a4235_0%,#8d4f39_60%,#b17755_100%)] p-3 text-[#fff5e7]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f2d8c0]">
          {book.format.toUpperCase()}
        </div>
        <div className="mt-5 text-2xl leading-tight tracking-[-0.04em] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
          {book.title}
        </div>
        <div className="mt-2 text-sm text-[#f4dbc3]">{book.author}</div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#4e342e]">{cta}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8d4f39]">{progressLabel}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-[#8d4f39] transition group-hover:translate-x-1" />
      </div>
    </button>
  );
}

function EmptyShelf({ body, title }: { body: string; title: string }) {
  return (
    <div className="md:col-span-full rounded-[24px] border border-dashed border-[#8d4f39]/22 bg-[#fbefdf] p-8 text-center">
      <div className="text-2xl text-[#4e342e] [font-family:'Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif]">
        {title}
      </div>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#704034]">{body}</p>
    </div>
  );
}

function Notice({
  children,
  tone
}: {
  children: React.ReactNode;
  tone: "error" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border px-4 py-3 text-sm leading-6",
        tone === "success"
          ? "border-[#8d4f39]/18 bg-[#f5dfc7] text-[#5a392d]"
          : "border-[#8d4f39]/24 bg-[#fff0eb] text-[#7e3d30]"
      )}
    >
      {children}
    </div>
  );
}

function StatusChip({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-[#d7b899]/22 bg-[#fff7ec]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#f3ddc7]">
      {label}
    </div>
  );
}

function resolveReadModeGuide(): ReadModeGuide {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("windows")) {
    return {
      label: "Windows",
      title: "Turn on Focus on Windows",
      steps: [
        "Open the Notification Center from the taskbar.",
        "Turn on Focus or Do Not Disturb before returning to the book.",
        "Keep reading here while the app stays fullscreen and the screen stays awake."
      ]
    };
  }

  if (ua.includes("android")) {
    return {
      label: "Android",
      title: "Turn on Do Not Disturb on Android",
      steps: [
        "Swipe down from the top of your phone to open Quick Settings.",
        "Tap Do Not Disturb or Bedtime mode.",
        "Return to the book and continue reading in fullscreen."
      ]
    };
  }

  if (ua.includes("iphone") || ua.includes("ipad")) {
    return {
      label: "iPhone or iPad",
      title: "Turn on Focus on iPhone or iPad",
      steps: [
        "Open Control Center.",
        "Tap Focus and choose Do Not Disturb or Reading.",
        "Come back to the app to continue in your quiet reading mode."
      ]
    };
  }

  if (ua.includes("mac os")) {
    return {
      label: "macOS",
      title: "Turn on Focus on macOS",
      steps: [
        "Open Control Center from the menu bar.",
        "Choose Focus, then enable Do Not Disturb or Reading.",
        "Return to the book once your Mac is quiet."
      ]
    };
  }

  return {
    label: "your device",
    title: "Turn on your device’s quiet mode",
    steps: [
      "Open your device’s quick settings, control center, or notification panel.",
      "Enable Do Not Disturb, Focus, Bedtime, or another quiet mode.",
      "Return here to keep reading in fullscreen."
    ]
  };
}
