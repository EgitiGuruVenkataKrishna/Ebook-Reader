import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function invariant(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
