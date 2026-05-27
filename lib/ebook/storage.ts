import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import type { BookRecord, ReaderFormat, SessionUser, UserRecord } from "@/lib/ebook/types";

const dataRoot = path.join(process.cwd(), "data", "ebook-reader");
const usersWorkbookPath = path.join(dataRoot, "users.xlsx");

const USERS_SHEET = "Users";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function userDirectory(email: string) {
  const digest = createHash("sha1").update(normalizeEmail(email)).digest("hex").slice(0, 16);
  return path.join(dataRoot, "users", digest);
}

function libraryPath(email: string) {
  return path.join(userDirectory(email), "library.json");
}

function booksDirectory(email: string) {
  return path.join(userDirectory(email), "books");
}

async function ensureDirectory(target: string) {
  await mkdir(target, { recursive: true });
}

async function ensureUsersWorkbook() {
  await ensureDirectory(dataRoot);

  try {
    await stat(usersWorkbookPath);
  } catch {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet<UserRecord>([]);

    XLSX.utils.book_append_sheet(workbook, sheet, USERS_SHEET);
    XLSX.writeFile(workbook, usersWorkbookPath);
  }
}

async function readUsersWorkbook() {
  await ensureUsersWorkbook();

  const workbook = XLSX.readFile(usersWorkbookPath);
  const sheet = workbook.Sheets[USERS_SHEET];

  if (!sheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json<UserRecord>(sheet).map((record) => ({
    ...record,
    email: normalizeEmail(record.email)
  }));
}

async function writeUsersWorkbook(users: UserRecord[]) {
  await ensureUsersWorkbook();

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(users);

  XLSX.utils.book_append_sheet(workbook, sheet, USERS_SHEET);
  XLSX.writeFile(workbook, usersWorkbookPath);
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${digest}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, digest] = passwordHash.split(":");

  if (!salt || !digest) {
    return false;
  }

  const derived = scryptSync(password, salt, 64);
  const stored = Buffer.from(digest, "hex");

  if (derived.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(derived, stored);
}

function createEmptyLibrary(email: string) {
  return { userEmail: normalizeEmail(email), books: [] as BookRecord[] };
}

async function readLibrary(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const target = libraryPath(normalizedEmail);

  await ensureDirectory(userDirectory(normalizedEmail));
  await ensureDirectory(booksDirectory(normalizedEmail));

  try {
    const contents = await readFile(target, "utf8");
    const parsed = JSON.parse(contents) as { books?: BookRecord[] };

    return parsed.books ?? [];
  } catch {
    const library = createEmptyLibrary(normalizedEmail);
    await writeFile(target, JSON.stringify(library, null, 2), "utf8");
    return [];
  }
}

async function writeLibrary(email: string, books: BookRecord[]) {
  const normalizedEmail = normalizeEmail(email);
  const target = libraryPath(normalizedEmail);

  await ensureDirectory(userDirectory(normalizedEmail));
  await ensureDirectory(booksDirectory(normalizedEmail));
  await writeFile(
    target,
    JSON.stringify({ userEmail: normalizedEmail, books }, null, 2),
    "utf8"
  );
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

export async function registerUser(email: string, password: string): Promise<SessionUser> {
  const normalizedEmail = normalizeEmail(email);
  const users = await readUsersWorkbook();
  const existing = users.find((user) => user.email === normalizedEmail);

  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const now = new Date().toISOString();
  const user: UserRecord = {
    id: randomUUID(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: now,
    lastLogin: now
  };

  users.push(user);
  await writeUsersWorkbook(users);
  await ensureDirectory(userDirectory(normalizedEmail));
  await ensureDirectory(booksDirectory(normalizedEmail));
  await writeLibrary(normalizedEmail, []);

  return { email: normalizedEmail };
}

export async function loginUser(email: string, password: string): Promise<SessionUser> {
  const normalizedEmail = normalizeEmail(email);
  const users = await readUsersWorkbook();
  const user = users.find((entry) => entry.email === normalizedEmail);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  user.lastLogin = new Date().toISOString();
  await writeUsersWorkbook(users);

  return { email: normalizedEmail };
}

export async function listBooks(email: string) {
  const books = await readLibrary(email);

  return books.sort((left, right) => {
    return new Date(right.lastOpenedAt).getTime() - new Date(left.lastOpenedAt).getTime();
  });
}

export async function saveBookUpload(email: string, file: File) {
  const normalizedEmail = normalizeEmail(email);
  const bytes = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  const format = inferFormat(file.name, file.type);
  const targetDirectory = path.join(booksDirectory(normalizedEmail), id);
  const targetPath = path.join(targetDirectory, file.name);
  const now = new Date().toISOString();

  await ensureDirectory(targetDirectory);
  await writeFile(targetPath, bytes);

  const books = await readLibrary(normalizedEmail);
  const record: BookRecord = {
    id,
    userEmail: normalizedEmail,
    title: inferTitle(file.name),
    author: "Local upload",
    format,
    fileName: file.name,
    filePath: targetPath,
    mimeType: file.type || (format === "epub" ? "application/epub+zip" : "application/pdf"),
    currentPage: 0,
    totalPagesHint: format === "pdf" ? 0 : 1,
    importedAt: now,
    lastOpenedAt: now
  };

  await writeLibrary(normalizedEmail, [record, ...books]);

  return record;
}

export async function updateBookProgress(email: string, bookId: string, currentPage: number) {
  const normalizedEmail = normalizeEmail(email);
  const books = await readLibrary(normalizedEmail);
  const nextBooks = books.map((book) => {
    if (book.id !== bookId) {
      return book;
    }

    return {
      ...book,
      currentPage,
      lastOpenedAt: new Date().toISOString()
    };
  });

  await writeLibrary(normalizedEmail, nextBooks);

  return nextBooks.find((book) => book.id === bookId) ?? null;
}

export async function getBookFile(email: string, bookId: string) {
  const normalizedEmail = normalizeEmail(email);
  const books = await readLibrary(normalizedEmail);
  const book = books.find((entry) => entry.id === bookId);

  if (!book) {
    throw new Error("Book not found.");
  }

  const bytes = await readFile(book.filePath);

  return { book, bytes };
}
