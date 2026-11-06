// Run: node --experimental-strip-types scripts/vad.check.ts
import assert from 'node:assert/strict';
import { VAD_BARGE_IN, VAD_TURNO, vadInit, vadStep, type VadCfg, type VadEvent } from '../src/lib/vad.ts';

function run(cfg: VadCfg, segs: [rms: number, ms: number][]): { ev: [VadEvent, number][] } {
  let s = vadInit(); const ev: [VadEvent, number][] = [];
  for (const [rms, ms] of segs) for (let i = 0; i < ms / cfg.frameMs; i++) {
    const r = vadStep(s, rms, cfg); s = r.state; for (const e of r.events) ev.push([e, s.t]);
  }
  return { ev };
}
const names = (r: { ev: [VadEvent, number][] }) => r.ev.map((e) => e[0]);

// speech then 1.2 s silence -> start then end
let r = run(VAD_TURNO, [[0.005, 400], [0.1, 1000], [0.004, 1500]]);
assert.deepEqual(names(r), ['speech_start', 'speech_end']);
assert.ok(r.ev[1][1] - r.ev[0][1] >= 850 + 1200 - 50);
// short blip (100 ms) is not speech
r = run(VAD_TURNO, [[0.005, 400], [0.1, 100], [0.005, 1000]]);
assert.deepEqual(names(r), []);
// pause shorter than 1.2 s inside speech does not end turn
r = run(VAD_TURNO, [[0.005, 400], [0.1, 500], [0.004, 900], [0.1, 500], [0.004, 1500]]);
assert.deepEqual(names(r), ['speech_start', 'speech_end']);
assert.ok(r.ev[1][1] > 400 + 500 + 900 + 500);
// nothing: nudge at 8 s, give_up at 15 s
r = run(VAD_TURNO, [[0.004, 16000]]);
assert.deepEqual(names(r), ['nudge', 'give_up']);
assert.ok(r.ev[0][1] >= 8000 && r.ev[1][1] >= 15000);
// continuous speech hits the 20 s cap
r = run(VAD_TURNO, [[0.005, 400], [0.1, 25000]]);
assert.deepEqual(names(r), ['speech_start', 'max_turn']);
// noisy room (floor 0.02): speech must exceed floor*3 = 0.06
r = run(VAD_TURNO, [[0.02, 400], [0.05, 1000], [0.02, 500]]);
assert.deepEqual(names(r), []);
r = run(VAD_TURNO, [[0.02, 400], [0.09, 600], [0.02, 1500]]);
assert.deepEqual(names(r), ['speech_start', 'speech_end']);
// barge-in: needs 300 ms, never ends or nudges
r = run(VAD_BARGE_IN, [[0.005, 400], [0.1, 250], [0.005, 500]]);
assert.deepEqual(names(r), []);
r = run(VAD_BARGE_IN, [[0.005, 400], [0.1, 400], [0.005, 20000]]);
assert.deepEqual(names(r), ['speech_start']);
console.log('vad: all checks passed');
