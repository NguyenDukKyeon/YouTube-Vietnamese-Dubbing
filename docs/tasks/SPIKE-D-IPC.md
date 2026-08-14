---
id: SPIKE-D-IPC
title: Extension to companion IPC and security feasibility
type: technical-spike
phase: TECHNICAL_SPIKES
status: BLOCKED
priority: P1
next: false
allowlist_mode: strict
base_ref: main
depends_on: [SPIKE-B-VIENEU]
ci_profile: spike
risk_refs: [R-IPC-01, R-IPC-02, R-IPC-03]
decision_refs: [D19, D20, D21, D22, D23, D25]
---

# SPIKE-D-IPC — Extension ↔ Companion IPC/security feasibility

## 1. Goal
Freeze a safe companion startup/trust/data boundary without prematurely choosing HTTP, WebSocket, Native Messaging, or a split control/data plane.

## 2. Question
Which transport or split transport best satisfies start/reconnect/cancel + measured bulk data + least privilege + resistance to hostile webpages/local callers on the actual Windows/Chrome environment?

## 3. Controlling context
- `AGENTS.md`
- `AI_WORKFLOW.md`
- `docs/CI_PROTOCOL.md`
- `docs/DISCOVERY.md` — IPC constraints and R-IPC-01/02/03
- `docs/DECISIONS.md` — D19/D20/D21/D22/D23/D25

## 4. Preconditions
- [ ] SPIKE-B payload-size characteristics available or human explicitly authorizes placeholder representative sizes;
- [ ] Windows + Chrome target environment available;
- [ ] no real cloud secrets required for test.

## 5. In scope
Disposable companion echo/stub only. Compare at least:
- authenticated HTTP loopback;
- authenticated WebSocket loopback if streaming materially matters;
- Chrome Native Messaging;
- split launch/control + data plane if evidence justifies it.

Test normal connect, companion absent, companion restart, browser restart, rapid cancellation/discard, payload sizes matching B, hostile normal webpage request, missing/wrong token, forged Origin, second local process, malformed/oversized messages, and install/registration/startup steps.

## 6. Out of scope
- real cloud provider integration/keys;
- production installer/service architecture;
- final TTS server;
- arbitrary command/filesystem RPC;
- production cache;
- treating CORS/random port/loopback as sole authentication.

## 7. Allowed paths
- `spikes/spike-d-ipc/**`
- `evidence/SPIKE-D-IPC/**`

## 8. Acceptance criteria
Chosen boundary or bounded combination must demonstrate:
- [ ] AC-01: no unauthenticated privileged TTS/translation-like operation;
- [ ] AC-02: network transport binds only intended loopback interface(s), never LAN wildcard;
- [ ] AC-03: a normal hostile webpage cannot invoke privileged work merely by issuing loopback requests;
- [ ] AC-04: reconnect after companion restart works deterministically;
- [ ] AC-05: cancellation/discard signal semantics are deterministic and measured;
- [ ] AC-06: defined `not running → start or offer start` behavior exists;
- [ ] AC-07: no cloud secret is sent to page code or committed to extension/repo;
- [ ] AC-08: payload strategy handles measured B audio sizes without hidden framing/message-limit failure;
- [ ] AC-09: install/registration/startup complexity is recorded for each candidate;
- [ ] AC-10: security decision distinguishes webpage threat, other tab, and same-user local-process threat instead of claiming loopback/CORS solves all.

## 9. Failure criteria
FAILED if only CORS/port secrecy protects privileged operations, listener exposes LAN, Native Messaging requires unsafe message workarounds for required payloads, companion startup requires page-controlled arbitrary executable invocation, or no bounded authenticated/reconnectable option is viable.

## 10. Required evidence
`evidence/SPIKE-D-IPC/`:
- exact OS/Chrome/head;
- transport comparison matrix;
- connection/reconnection/startup latency;
- framing/throughput/message-size observations;
- cancel latency/result;
- hostile-call test matrix (wrong/missing token, Origin variation, normal webpage, malformed/oversized input, second local process where safely testable);
- install/registration steps;
- packet/message traces excluding secrets;
- decision record recommending control/data-plane boundary with explicit trade-offs.

## 11. CI / target verification
`ci_profile: spike`. CI may test protocol/parser/auth logic locally; Chrome Native Messaging registration/startup and hostile-browser behavior require target environment.

## 12. Security/privacy invariants
- CORS is defense-in-depth, not authentication;
- random/fixed port is not a secret;
- no external/LAN bind;
- no arbitrary shell/file operations;
- captions/text remain data;
- credentials remain in companion secure-store boundary and are not needed for this spike.

## 13. Deliverables
Disposable IPC stub/harness + threat-test evidence + transport comparison decision record + one bounded PR.

## 14. Audit focus
Authentication—not just CORS; binding scope; hostile webpage test; launch semantics; reconnect/cancel; payload-size evidence from B; no secrets; no unsafe generic RPC; explicit limitations against malicious same-user local processes.

## 15. Non-claims
ACCEPT does not finalize production installer/service implementation or claim protection against a fully compromised same-user machine. It only resolves a viable least-privilege startup/control/data boundary for SPEC.
