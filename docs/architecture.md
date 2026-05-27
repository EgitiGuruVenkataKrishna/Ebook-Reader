# Architecture

## Request Flow

```text
Workbench UI
  -> POST /api/process
  -> validate request with Zod
  -> parse YouTube video ID
  -> fetch metadata when YOUTUBE_API_KEY exists
  -> estimate duration from provider data or transcript
  -> build output plan
  -> generate drafts
  -> persist job in development store
  -> return structured result
```

## Production Flow

```text
Workbench UI
  -> API creates processing_job row
  -> queue event
  -> worker fetches transcript or transcribes audio
  -> worker chunks transcript
  -> worker generates content assets
  -> worker persists outputs
  -> UI polls job status or receives realtime update
```

## Reliability Rules

- Validate all inputs at the edge.
- Keep video processing outside request-response handlers.
- Persist job progress after each step.
- Make worker steps idempotent.
- Retry transient provider failures with backoff.
- Store structured errors and user-safe recovery messages.
- Meter usage before expensive provider calls.
- Apply duration and transcript-size limits by subscription plan.

## Suggested Tables

```sql
users
workspaces
workspace_members
youtube_sources
processing_jobs
transcripts
content_outputs
usage_events
subscriptions
prompt_versions
```

## Provider Boundaries

- YouTube metadata provider
- Transcript provider
- Transcription provider
- AI generation provider
- Job queue provider
- Billing and metering provider
- Object storage provider

Keeping these boundaries explicit lets the app start lean while remaining deployable as a real SaaS.
