export type ReaderFormat = "pdf" | "epub";

export interface SessionUser {
  email: string;
}

export interface UserRecord extends SessionUser {
  id: string;
  passwordHash: string;
  createdAt: string;
  lastLogin: string;
}

export interface BookRecord {
  id: string;
  userEmail: string;
  title: string;
  author: string;
  format: ReaderFormat;
  fileName: string;
  mimeType: string;
  currentPage: number;
  totalPagesHint: number;
  importedAt: string;
  lastOpenedAt: string;
}
