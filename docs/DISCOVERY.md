# Discovery Baseline

Status: `READY_FOR_TECHNICAL_SPIKES`  
SPEC gate: `NOT_READY_FOR_SPEC`

This is the canonical discovery digest used for task routing. The original research report was broader; this file records the architecture-relevant conclusions, verified constraints, unresolved risks, and required spikes. It must not be treated as a production implementation plan.

## 1. Executive conclusion

The project is feasible at platform level, but SPEC must not freeze yet.

Three P0 blockers remain:

1. **P0-CAP** — a stable-enough arbitrary-public-video English caption acquisition path has not yet been empirically demonstrated.
2. **P0-TTS** — VieNeu realtime throughput, long-run stability, technical Vietnamese/English pronunciation and cancellation/discard behavior on the actual target Windows machine remain unverified.
3. **P0-TRANSLATION** — no zero-cost candidate has yet been empirically shown to satisfy the full spoken-natural/context/duration-fit translation policy.

Architecture-relevant P1 risks remain around playback synchronization, ducking, auto-dub activation, and companion IPC/security.

Therefore:
- `READY_FOR_TECHNICAL_SPIKES`
- `NOT_READY_FOR_SPEC`

## 2. Verified platform constraints

### YouTube captions

- YouTube Data API `captions.list` lists track resources; it is not transcript content.
- `captions.download` is not a general arbitrary-public-video caption path because it requires appropriate authenticated edit permission on the video.
- Current YouTube player/internal state is observed to expose caption track metadata including track URLs/identity/type, and current ecosystem tooling distinguishes ASR from standard tracks.
- Current subtitle fetching may involve signed/expiring URLs, throttling and PO-token/client policy. This is an undocumented implementation dependency, not a stable public API contract.
- Public docs do not provide a reliable universal word-level timing guarantee. Downstream design must be safe with segment-level `{startMs,endMs,text}` timing.
- YouTube is an SPA. Navigation signals such as `yt-navigate-finish` are observed implementation details; semantic video/videoId change must be the source of lifecycle truth.

Implication: caption acquisition must sit behind a replaceable YouTube adapter and be empirically proven in a real browser.

### Chrome MV3

- Content scripts default to isolated world; page JS globals are not directly shared.
- MAIN-world execution exists but shares the page environment and must be kept minimal; page/MAIN messages are untrusted.
- MV3 service workers are ephemeral; authoritative realtime playback queue/scheduler state must not depend only on service-worker globals.
- Offscreen documents are a valid extension-owned DOM/audio candidate but are not a permanent background page.
- Privileged extension contexts can make host-permission-gated cross-origin requests; page/content-script networking has different origin constraints.
- MV3 forbids remote-hosted executable JS/WASM in the extension package.
- `chrome.storage.local` is not an appropriate default large audio-blob cache. Browser binary storage exists, but companion filesystem is a stronger current candidate for multi-GB bounded audio.

### Native/local IPC

- Chrome Native Messaging supports exact extension-origin allowlisting and can launch a registered native host.
- Native Messaging has message-size/framing constraints; it must not be selected blindly as the bulk audio data plane.
- HTTP/WebSocket loopback are viable transports but expose a local listener and require authentication; CORS, port randomness and loopback binding are not authentication.

Implication: exact control/data-plane split remains provisional pending SPIKE-D.

### VieNeu

- Current VieNeu v3 Turbo path provides a local CPU ONNX streaming API, current preset voices and 48 kHz output; CPU installation does not inherently require a Torch GPU stack.
- Maintainer performance claims are not sufficient target-machine evidence.
- Technical code-switching, math/science terminology, acronyms/numbers, long-form quality, mid-inference cancellation and safe concurrency remain empirically unknown for this project.

Implication: VieNeu remains primary candidate only, not frozen dependency, until SPIKE-B.

### Translation

- Chrome Translator API provides a real browser-local English→Vietnamese translation candidate after language-pack setup, but its public API is translation-oriented rather than an arbitrary prompted rewrite model.
- Gemini Developer API has generative capability suitable in principle for translate + spoken rewrite + shortening, but actual quality/latency/quota/privacy trade-offs must be benchmarked. Free/unpaid data handling requires explicit privacy policy/consent rather than silent default use.
- Azure Translator F0 and DeepL API Free are current zero-cost cloud MT candidates with credentials/quota constraints; traditional MT capability must not be confused with prompted spoken rewrite.
- Provider free quotas and policies are external and may change; SPEC must not encode a permanent hard quota assumption.

Implication: provider boundary must distinguish capabilities such as context, rewrite/instructions, concise output, streaming/cancellation, local/offline readiness, latency, quota and disclosure policy.

### Synchronization/audio

- `video.currentTime` is a sound master-clock choice.
- Media events cover play/pause/seeking/seeked/ratechange/waiting/playing/stalled/ended, but events alone do not prove continuous drift behavior.
- Preferred scheduler candidate is hybrid: semantic events trigger immediate invalidation/reschedule; lightweight time comparison detects accumulated drift.
- At playback rate `R`, a media slot `[S,E]` has roughly `(E-S)/R` wall-clock duration. 2× therefore materially tightens duration fitting.
- Routing YouTube original media through a Web Audio `MediaElementAudioSourceNode` is not a safe universal primary ducking assumption because CORS-classified cross-origin media can yield silence.
- Direct media-element volume control is a safer candidate but must be tested against YouTube's own volume UI/persistence and smooth fade behavior.

## 3. Safe decisions to retain

Discovery supports retaining these product/architecture policies without re-brainstorming:

- adaptive startup/buffering rather than fixed startup seconds;
- seek reprioritization while retaining completed cache;
- sliding translation context with current-only output;
- separate translation and audio caches;
- raw vs normalized captions separated;
- D13 duration-fit hierarchy as policy, while all numeric thresholds stay provisional;
- `video.currentTime` as master clock;
- semantic videoId reset on YouTube SPA navigation;
- Local Companion boundary for native TTS/secrets/large cache;
- local/browser before cloud fallback;
- minimal cloud disclosure and local-only mode;
- quiet recovery UI with richer hidden diagnostics.

## 4. Decisions still provisional

Do not freeze these before their resolving spike/evidence:

| Decision | Unknown | Resolving spike |
|---|---|---|
| Exact caption acquisition mechanism | player representation, fetch context, token/URL behavior | A |
| Caption fallback resilience | whether second path reduces real failure modes | A |
| Caption granularity beyond segments | reliable word offsets | A |
| VieNeu as primary TTS | target throughput, TTFA, RAM, quality, cancellation | B |
| TTS speed/retiming strategy | useful native speed control vs downstream retime | B/C |
| Translation provider ordering | D3/D10/D13 quality + latency + zero-cost viability | E |
| Chrome Translator role | full path vs literal/local emergency fallback | E |
| Gemini free normal fallback | quality, actual account limits, privacy choice | E + human |
| Companion IPC | HTTP/WS/Native Messaging/split | D |
| Auto-start companion | Native Messaging vs explicit OS mechanism | D |
| Scheduler/audio ownership | tab context vs offscreen | C |
| Drift thresholds | human-perceptible acceptable window | C + human |
| Duration-fit thresholds | rewrite/speed/overflow cutoffs | B/C/E + human |
| Adaptive startup threshold | real throughput/headroom | B/E/C |
| Ducking operational path | direct media volume interaction | C |
| Cache size/encoding | bytes/hour and target usage | B + human |
| Caption invalidation fingerprint | observable track/payload identity fields | A |

## 5. Risk register

### P0 — Architecture breakers

**R-CAP-01**: arbitrary public captions depend on undocumented YouTube player internals because official download API does not provide a general public-video path.  
Mitigation candidate: replaceable adapter + empirical real-browser acquisition + classified unsupported state.  
Needs SPIKE-A.

**R-CAP-02**: timed-text fetching may require changing token/signature/client policy or encounter 403/429/expiry behavior.  
Mitigation candidate: prove a viable real-browser fetch context; catalog variants; never hard-code a one-off signed URL.  
Needs SPIKE-A.

**R-TTS-01**: VieNeu may not sustain preparation throughput on target machine.  
Needs SPIKE-B.

**R-TTS-02**: technical mixed Vietnamese/English pronunciation/naturalness may be unacceptable despite throughput.  
Needs SPIKE-B.

**R-TR-01**: no zero-cost provider path is yet proven to satisfy full spoken-natural/context/duration-fit policy.  
Needs SPIKE-E.

### P1 — Major architecture/UX/security risks

**R-SYNC-01**: drift/recovery after pause, repeated seek, buffering and playback-rate changes. Needs C.

**R-DUR-01**: 1.5×/2× can make Vietnamese output exceed available wall-clock slots. Needs B/C/E.

**R-SPA-01**: stale queue/audio can leak after SPA video switch. Needs A/C.

**R-AUTO-01**: first-use local model/audio activation may require user interaction. Needs C/E observation.

**R-AUD-01**: Web Audio original-media capture/ducking may fail under cross-origin behavior. Research rejects it as a primary universal assumption; C validates direct-volume UX.

**R-IPC-01**: unauthenticated localhost endpoint can be driven by hostile callers. Needs D.

**R-IPC-02**: pure HTTP/WS cannot by itself start a non-running companion. Needs D/control-plane decision.

**R-IPC-03**: Native Messaging may be awkward for bulk/streaming audio. Needs D with measured B payloads.

**R-QUOTA-01**: free provider quota/policy can change/exhaust. Mitigate with capability/fallback ladder + cache + local path.

**R-PRIV-01**: cloud provider unpaid/free data treatment may conflict with silent privacy expectations. Mitigate with explicit provider/privacy mode and local-only default capability.

**R-CACHE-01**: long-form audio cache can grow large. Current candidate: companion filesystem + byte-bounded eviction; size awaits measurements.

## 6. Required technical spikes

### SPIKE-A — Caption acquisition
Goal: prove/falsify real MV3 acquisition of original-English manual/ASR timed segments across representative videos and SPA navigation.  
Canonical task manifest: `docs/tasks/SPIKE-A-CAPTION.md`.

### SPIKE-B — VieNeu target-machine benchmark
Measure exact target Windows environment: cold/warm model load, TTFA, total generation time, RTF/media-seconds-per-wall-second, CPU/GPU, RAM, audio duration/size, chunk-length sensitivity, long-run stability, technical pronunciation/naturalness, repeated-run variation, cancellation/discard behavior. Minimum architecture gate: sustained 1× preparation on target with no systematic quality blocker.

### SPIKE-E — Zero-cost translation fitness
Blind/shared corpus comparison of Chrome Translator, Gemini free-tier-capable path, Azure F0 and DeepL Free where available. Separate direct translation, context-aware translation, spoken-natural rewrite and concise-duration rewrite. At least one zero-cost path must preserve meaning/terminology, support or compose into spoken-natural output, provide viable shortening, and show latency/throughput compatible with adaptive buffering.

### SPIKE-C — Playback synchronization + ducking
Use pre-generated fixed audio fixtures, not live translation/TTS, to isolate sync. Stress play/pause/seeks/rate changes/buffering/SPA switch/user volume/auto-dub lifecycle/ad transition if observed. Pass requires no unbounded drift or stale old-video audio and deterministic bounded recovery.

### SPIKE-D — Extension ↔ Companion IPC/security
Compare authenticated loopback HTTP, WebSocket if streaming is justified, and Native Messaging/split plane. Test startup, reconnect, cancellation, hostile webpage attempts, wrong/missing token, malformed/oversized payload, second local process, and payload sizes measured in B.

## 7. Spike ordering / readiness gate

Default sequence:
1. A → independent audit
2. B → independent audit
3. E → independent audit
4. P0 gate review
5. C → independent audit
6. D → independent audit
7. SPEC readiness review

A/B/E are independently executable in principle, but the default queue is sequential to keep evidence/audit bounded. D should consume measured payload characteristics from B.

## 8. SPEC readiness rule

Declare `READY_FOR_SPEC` only when:
- P0 unknown count is zero; and
- architecture-relevant P1 risks are resolved, isolated behind a stable boundary, or explicitly accepted by the human with mitigation.

Until then the only valid SPEC status is `NOT_READY_FOR_SPEC`.
