# Task Queue

This file is a routing index only. Each task manifest is authoritative for task semantics.

## Current project phase

`TECHNICAL_SPIKES`

## NEXT

Exactly one task should normally be marked NEXT.

| Order | Task | Type | Status | Blocking gate | Notes |
|---:|---|---|---|---|---|
| 1 | `SPIKE-A-CAPTION` | technical-spike | READY | P0 caption acquisition | **NEXT** |
| 2 | `SPIKE-B-VIENEU` | technical-spike | READY | P0 local TTS | Run after A audit unless human explicitly parallelizes |
| 3 | `SPIKE-E-TRANSLATION` | technical-spike | READY | P0 zero-cost translation | Run after B audit unless human explicitly parallelizes |
| 4 | `SPIKE-C-SYNC` | technical-spike | BLOCKED | P1 sync/ducking | Unblock after P0 review gate or explicit human decision |
| 5 | `SPIKE-D-IPC` | technical-spike | BLOCKED | P1 IPC/security | Needs measured payload characteristics from B |

## Queue rules

- Only a task whose own manifest says `status: READY` may execute.
- `NEXT` is routing convenience, not authority to ignore manifest preconditions.
- Do not reorder/parallelize silently.
- Human may reorder independent tasks by explicitly updating canonical queue/manifests.
- PR acceptance does not automatically advance project phase.
- After A/B/E are independently accepted, perform P0 gate review before SPEC.
- C/D must resolve or isolate architecture-relevant P1 risks before SPEC readiness.
