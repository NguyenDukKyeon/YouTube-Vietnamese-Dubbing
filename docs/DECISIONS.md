# Product Decisions

Status: HUMAN-APPROVED BRAINSTORM BASELINE  
Current phase: `TECHNICAL_SPIKES`

These decisions are fixed product inputs to Discovery/Spikes. A spike may flag infeasibility/trade-offs with evidence, but must not silently rewrite them.

## D1 — Supported content
MVP supports regular YouTube videos, English → Vietnamese, with usable manual or auto-generated English captions. No ASR/Whisper, livestreams, Shorts, arbitrary websites, or no-caption videos in MVP.

## D2 — Terminology
Adaptive terminology. Preserve English technical terms where natural for Vietnamese users; hybrid phrases are allowed. Do not mechanically Việt-hóa or mechanically preserve every term.

## D3 — Translation style
Adaptive spoken-natural Vietnamese: faithful meaning + natural speech + duration fit. May remove non-informational filler and shorten without losing important meaning. Must not add explanations/knowledge not spoken by source.

## D4 — Original audio
Adaptive ducking + user slider. Duck the entire original soundtrack during dub. No speech/music/SFX source separation in MVP.

## D5 — Dub underrun
Video continues by default. Prioritize current/next chunks. Optional setting may pause video when dubbing falls behind.

## D6 — Startup
Adaptive startup buffer based on measured translation/TTS throughput, not a universal hard-coded number.

## D7 — Seek
Reprioritize + cache. Keep READY cache, drop/deprioritize stale pending work, cancel in-flight work when supported/sensible, prioritize new current region.

## D8 — Translation providers
Hybrid provider strategy with a zero-cost path. Candidates: Gemini free-tier-capable models, Chrome Translator API, Azure Translator F0, DeepL API Free. Final ordering awaits benchmark.

## D9 — Voice
One user-selectable voice for whole video/session. No diarization, multi-speaker dubbing, voice cloning, or automatic speaker matching in MVP.

## D10 — Translation context
Sliding context window: small number of previous chunks + current + limited lookahead when available + terminology state. Output only current chunk.

## D11 — Cache
Persistent bounded cache. Translation and audio caches are separate; voice changes must not force retranslation. Use invalidation/versioning and bounded eviction.

## D12 — Caption cleanup
Conservative normalization. Always retain raw caption separately from normalized caption. Never invent source content.

## D13 — Duration fitting
Policy order:
1. faithful natural translation;
2. shorter rewrite without meaning loss;
3. mild speech-rate adjustment;
4. bounded overflow;
5. concise fallback + quality-degradation signal.
Numerical thresholds remain provisional until spikes.

## D14 — Manual editing
No translation, pronunciation, subtitle, timing, or glossary editor in MVP. Automation-first viewing.

## D15 — Vietnamese subtitles
Optional ON/OFF; reuse same translation produced for dubbing.

## D16 — Activation
Dub Vietnamese ON/OFF + optional auto-dub for eligible English videos. Remember voice, volume, subtitle and auto-dub preferences. Avoid unnecessary background processing.

## D17 — Playback speed
`video.currentTime` is master clock. Video playback rate and preferred voice speed are separate; never multiply them mechanically. Investigate 1×, 1.25×, 1.5×, 2×.

## D18 — YouTube SPA lifecycle
On semantic video/videoId change: stop old dub/queue, keep old cache, reinitialize new video, prevent old-audio leakage.

## D19 — Local TTS companion
VieNeu/local TTS candidate runs in Local Companion. Extension checks/starts/offers companion only when needed. Optional Windows auto-start; no 24/7 AI requirement.

## D20 — TTS fallback
VieNeu local primary candidate. Prefer local/browser fallback. Cloud TTS only under explicit user policy; never silently upload text.

## D21 — Offline behavior
Use cached translation/audio first, then local translation/TTS when available. If translation unavailable, dub may stop while video continues. Resume near current position when network returns.

## D22 — Privacy
Minimal cloud disclosure: current chunk + necessary nearby context + required terminology state. Local-only mode means zero cloud requests.

## D23 — Secrets
Extension does not hold cloud API keys. Local Companion owns provider credentials and OS-native secure storage. Never hard-code secrets.

## D24 — Quality vs latency
Adaptive Quality. Healthy buffer permits higher-quality processing; low buffer prioritizes current-region latency. Restore quality when buffer recovers.

## D25 — Error UX
Quiet recovery + minimal status. Retry/fallback first. Normal UI shows compact states; detailed diagnostics hidden under Advanced/Diagnostics.
