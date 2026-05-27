"use client";

import type { BookRecord, ReaderFormat, SessionUser, UserRecord } from "@/lib/ebook/types";

const DB_NAME = "ebook-reader-web";
const DB_VERSION = 1;
const USERS_STORE = "users";
const BOOKS_STORE = "books";

type StoredBookRecord = BookRecord & {
  fileBlob: Blob;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(USERS_STORE)) {
        database.createObjectStore(USERS_STORE, { keyPath: "email" });
      }

      if (!database.objectStoreNames.contains(BOOKS_STORE)) {
        const booksStore = database.createObjectStore(BOOKS_STORE, { keyPath: "id" });
        booksStore.createIndex("userEmail", "userEmail", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB."));
  });
}

async function hashPassword(email: string, password: string) {
  const encoder = new TextEncoder();
  const payload = encoder.encode(`${normalizeEmail(email)}::${password}`);
  const digest = await window.crypto.subtle.digest("SHA-256", payload);

  return Array.from(new Uint8Array(digest))
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
}

function inferFormat(fileName: string, mimeType: string): ReaderFormat {
  if (mimeType === "application/epub+zip" || fileName.toLowerCase().endsWith(".epub")) {
    return "epub";
  }

  return "pdf";
}

function inferTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled Book";
}

function toBookRecord(book: StoredBookRecord): BookRecord {
  const record = { ...book };
  delete (record as Partial<StoredBookRecord>).fileBlob;
  return record;
}

export async function registerStoredUser(email: string, password: string): Promise<SessionUser> {
  const normalizedEmail = normalizeEmail(email);
  const database = await openDatabase();
  const transaction = database.transaction(USERS_STORE, "readwrite");
  const store = transaction.objectStore(USERS_STORE);
  const existing = await requestToPromise(store.get(normalizedEmail));

  if (existing) {
    throw new Error("An account with this email already exists in this browser.");
  }

  const now = new Date().toISOString();
  const user: UserRecord = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash: await hashPassword(normalizedEmail, password),
    createdAt: now,
    lastLogin: now
  };

  store.put(user);
  await transactionDone(transaction);
  database.close();

  return { email: normalizedEmail };
}

export async function loginStoredUser(email: string, password: string): Promise<SessionUser> {
  const normalizedEmail = normalizeEmail(email);
  const database = await openDatabase();
  const transaction = database.transaction(USERS_STORE, "readwrite");
  const store = transaction.objectStore(USERS_STORE);
  const user = (await requestToPromise(store.get(normalizedEmail))) as UserRecord | undefined;

  if (!user) {
    throw new Error("No account with this email exists in this browser yet.");
  }

  const passwordHash = await hashPassword(normalizedEmail, password);

  if (user.passwordHash !== passwordHash) {
    throw new Error("Invalid email or password.");
  }

  user.lastLogin = new Date().toISOString();
  store.put(user);
  await transactionDone(transaction);
  database.close();

  return { email: normalizedEmail };
}

export async function listStoredBooks(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const database = await openDatabase();
  const transaction = database.transaction(BOOKS_STORE, "readonly");
  const store = transaction.objectStore(BOOKS_STORE);
  const allBooks = (await requestToPromise(store.getAll())) as StoredBookRecord[];

  database.close();

  return allBooks
    .filter((book) => book.userEmail === normalizedEmail)
    .map(toBookRecord)
    .sort((left, right) => {
      return new Date(right.lastOpenedAt).getTime() - new Date(left.lastOpenedAt).getTime();
    });
}

export async function saveStoredBookUpload(email: string, file: File) {
  const normalizedEmail = normalizeEmail(email);
  const database = await openDatabase();
  const transaction = database.transaction(BOOKS_STORE, "readwrite");
  const store = transaction.objectStore(BOOKS_STORE);
  const format = inferFormat(file.name, file.type);
  const now = new Date().toISOString();
  const record: StoredBookRecord = {
    id: crypto.randomUUID(),
    userEmail: normalizedEmail,
    title: inferTitle(file.name),
    author: "Local upload",
    format,
    fileName: file.name,
    mimeType: file.type || (format === "epub" ? "application/epub+zip" : "application/pdf"),
    currentPage: 0,
    totalPagesHint: format === "epub" ? 1 : 0,
    importedAt: now,
    lastOpenedAt: now,
    fileBlob: file
  };

  store.put(record);
  await transactionDone(transaction);
  database.close();

  return toBookRecord(record);
}

export async function updateStoredBookProgress(email: string, bookId: string, currentPage: number) {
  const normalizedEmail = normalizeEmail(email);
  const database = await openDatabase();
  const transaction = database.transaction(BOOKS_STORE, "readwrite");
  const store = transaction.objectStore(BOOKS_STORE);
  const book = (await requestToPromise(store.get(bookId))) as StoredBookRecord | undefined;

  if (!book || book.userEmail !== normalizedEmail) {
    database.close();
    return null;
  }

  const nextBook: StoredBookRecord = {
    ...book,
    currentPage,
    lastOpenedAt: new Date().toISOString()
  };

  store.put(nextBook);
  await transactionDone(transaction);
  database.close();

  return toBookRecord(nextBook);
}

export async function getStoredBookBlob(email: string, bookId: string) {
  const normalizedEmail = normalizeEmail(email);
  const database = await openDatabase();
  const transaction = database.transaction(BOOKS_STORE, "readonly");
  const store = transaction.objectStore(BOOKS_STORE);
  const book = (await requestToPromise(store.get(bookId))) as StoredBookRecord | undefined;

  database.close();

  if (!book || book.userEmail !== normalizedEmail) {
    throw new Error("Book not found in this browser.");
  }

  return book.fileBlob;
}
