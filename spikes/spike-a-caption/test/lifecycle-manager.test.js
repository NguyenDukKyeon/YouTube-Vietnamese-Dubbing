import test from 'node:test';
import assert from 'node:assert/strict';
import { LifecycleManager } from '../src/extractor/lifecycle-manager.js';
import { AcquisitionStatus } from '../src/types.js';

test('LifecycleManager increments generation and aborts prior request on transition', () => {
  const manager = new LifecycleManager();

  const session1 = manager.startTransition('vid_A');
  assert.equal(session1.generation, 1);
  assert.equal(session1.videoId, 'vid_A');
  assert.equal(session1.signal.aborted, false);

  const session2 = manager.startTransition('vid_B');
  assert.equal(session2.generation, 2);
  assert.equal(session2.videoId, 'vid_B');
  assert.equal(session1.signal.aborted, true); // Prior session aborted!
  assert.equal(session2.signal.aborted, false);
});

test('LifecycleManager rejects stale completion from older generation', () => {
  const manager = new LifecycleManager();

  const session1 = manager.startTransition('vid_A');
  manager.startTransition('vid_B'); // Advanced to generation 2

  // Simulate late arrival of session 1 result
  const lateResult = manager.finalizeResult(session1.generation, session1.videoId, {
    status: AcquisitionStatus.SUCCESS,
    segments: [{ startMs: 0, endMs: 1000, text: 'Stale A' }]
  });

  assert.equal(lateResult.status, AcquisitionStatus.STALE_GENERATION_DISCARDED);
  assert.ok(lateResult.errorMessage.includes('Discarded stale result'));
});

test('LifecycleManager handles rapid video switching (A -> B -> C) without cross-video leakage', () => {
  const manager = new LifecycleManager();

  const sessionA = manager.startTransition('vid_A');
  const sessionB = manager.startTransition('vid_B');
  const sessionC = manager.startTransition('vid_C');

  assert.equal(sessionA.signal.aborted, true);
  assert.equal(sessionB.signal.aborted, true);
  assert.equal(sessionC.signal.aborted, false);
  assert.equal(manager.generation, 3);
  assert.equal(manager.currentVideoId, 'vid_C');

  // Attempt resolving A and B results
  const resA = manager.finalizeResult(sessionA.generation, sessionA.videoId, { status: AcquisitionStatus.SUCCESS });
  const resB = manager.finalizeResult(sessionB.generation, sessionB.videoId, { status: AcquisitionStatus.SUCCESS });
  const resC = manager.finalizeResult(sessionC.generation, sessionC.videoId, { status: AcquisitionStatus.SUCCESS, segments: [{ startMs: 0, endMs: 2000, text: 'Correct C' }] });

  assert.equal(resA.status, AcquisitionStatus.STALE_GENERATION_DISCARDED);
  assert.equal(resB.status, AcquisitionStatus.STALE_GENERATION_DISCARDED);
  assert.equal(resC.status, AcquisitionStatus.SUCCESS);
  assert.equal(resC.videoId, 'vid_C');
  assert.equal(resC.generation, 3);

  const timeline = manager.getTimeline();
  assert.ok(timeline.some(e => e.event === 'STALE_RESULT_REJECTED' && e.videoId === 'vid_A'));
  assert.ok(timeline.some(e => e.event === 'STALE_RESULT_REJECTED' && e.videoId === 'vid_B'));
  assert.ok(timeline.some(e => e.event === 'ACQUISITION_COMPLETED' && e.videoId === 'vid_C'));
});
