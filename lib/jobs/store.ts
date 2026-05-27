import type { ProcessingResult } from "@/lib/content/types";

type StoredJob = {
  id: string;
  createdAt: string;
  result: ProcessingResult;
};

const globalStore = globalThis as typeof globalThis & {
  __ytContentForgeJobs?: Map<string, StoredJob>;
};

export function getJobStore() {
  if (!globalStore.__ytContentForgeJobs) {
    globalStore.__ytContentForgeJobs = new Map();
  }

  return globalStore.__ytContentForgeJobs;
}

export function saveJob(result: ProcessingResult) {
  const store = getJobStore();
  const job: StoredJob = {
    id: result.jobId,
    createdAt: new Date().toISOString(),
    result
  };

  store.set(result.jobId, job);
  return job;
}

export function findJob(id: string) {
  return getJobStore().get(id) ?? null;
}
