# YouTube Vietnamese Dubbing Extension

Personal-use Chrome Extension project for automatic English-caption → natural Vietnamese dubbing.

## Current phase

`TECHNICAL_SPIKES`

Discovery gate:
- `READY_FOR_TECHNICAL_SPIKES`
- `NOT_READY_FOR_SPEC`

Current NEXT task:
- `SPIKE-A-CAPTION`

## AI workflow entrypoint

Every executor must read in order:
1. `AGENTS.md`
2. `AI_WORKFLOW.md`
3. `docs/tasks/QUEUE.md`
4. controlling task manifest
5. `docs/CI_PROTOCOL.md`
6. only canonical context referenced by that manifest

GitHub is the canonical project memory. Chat history, PR summaries and author handoffs are not authoritative evidence.

## Current spike manifests

- `docs/tasks/SPIKE-A-CAPTION.md` — READY / NEXT
- `docs/tasks/SPIKE-B-VIENEU.md` — READY after A by default queue order
- `docs/tasks/SPIKE-E-TRANSLATION.md` — READY after B by default queue order
- `docs/tasks/SPIKE-C-SYNC.md` — BLOCKED pending P0 gate by default
- `docs/tasks/SPIKE-D-IPC.md` — BLOCKED pending prerequisite evidence

No production architecture or SPEC should be frozen until repo gates authorize it.
