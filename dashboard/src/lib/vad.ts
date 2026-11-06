// Pure voice-activity-detection state machine: frames of RMS in, events out. No DOM, no timers.

export interface VadCfg {
  frameMs: number;       // nominal frame period
  calibMs: number;       // noise-floor calibration window at the start of each listening window
  factor: number;        // speech when rms > floor * factor...
  minAbs: number;        // ...and rms > minAbs
  minSpeechMs: number;   // sustained speech needed to declare speech start
  silenceMs: number;     // trailing silence that ends the turn
  maxTurnMs: number;     // hard cap on one turn, measured from speech start
  nudgeMs: number;       // no speech yet -> "¿Sigue ahí?"
  giveUpMs: number;      // no speech yet -> stop listening, offer "Repetir pregunta"
  endOnSilence: boolean; // false for barge-in detection (only speech_start matters)
}

export const VAD_TURNO: VadCfg = {
  frameMs: 50, calibMs: 300, factor: 3, minAbs: 0.015, minSpeechMs: 150,
  silenceMs: 1200, maxTurnMs: 20000, nudgeMs: 8000, giveUpMs: 15000, endOnSilence: true,
};
/** Barge-in while the assistant talks: stricter (speaker bleed), 300 ms of sustained speech. */
export const VAD_BARGE_IN: VadCfg = {
  ...VAD_TURNO, minAbs: 0.04, minSpeechMs: 300, endOnSilence: false,
  maxTurnMs: Infinity, nudgeMs: Infinity, giveUpMs: Infinity,
};

export type VadEvent = 'speech_start' | 'speech_end' | 'max_turn' | 'nudge' | 'give_up';

export interface VadState {
  t: number; calibT: number; calibSum: number; calibN: number; floor: number | null;
  speaking: boolean; speechAcc: number; silenceAcc: number; speechStartT: number;
  nudged: boolean; done: boolean;
}

export const vadInit = (): VadState => ({
  t: 0, calibT: 0, calibSum: 0, calibN: 0, floor: null,
  speaking: false, speechAcc: 0, silenceAcc: 0, speechStartT: 0, nudged: false, done: false,
});

const MAX_FLOOR = 0.03; // a loud room (or early speech) must not make the threshold unreachable

export const vadThreshold = (s: VadState, cfg: VadCfg): number =>
  Math.max(cfg.minAbs, (s.floor ?? 0) * cfg.factor);

export function vadStep(prev: VadState, rms: number, cfg: VadCfg, dt: number = cfg.frameMs): { state: VadState; events: VadEvent[] } {
  if (prev.done) return { state: prev, events: [] };
  const s: VadState = { ...prev, t: prev.t + dt };
  const events: VadEvent[] = [];

  if (s.calibT < cfg.calibMs) {
    s.calibT += dt; s.calibSum += rms; s.calibN += 1;
    s.floor = Math.min(MAX_FLOOR, s.calibSum / s.calibN);
    return { state: s, events };
  }

  const loud = rms > vadThreshold(s, cfg);
  if (!s.speaking) {
    s.speechAcc = loud ? s.speechAcc + dt : 0;
    if (s.speechAcc >= cfg.minSpeechMs) {
      s.speaking = true; s.speechStartT = s.t; s.silenceAcc = 0; events.push('speech_start');
    } else {
      if (!s.nudged && s.t >= cfg.nudgeMs) { s.nudged = true; events.push('nudge'); }
      if (s.t >= cfg.giveUpMs) { s.done = true; events.push('give_up'); }
    }
    return { state: s, events };
  }

  s.silenceAcc = loud ? 0 : s.silenceAcc + dt;
  if (cfg.endOnSilence && s.silenceAcc >= cfg.silenceMs) { s.done = true; events.push('speech_end'); }
  else if (s.t - s.speechStartT >= cfg.maxTurnMs) { s.done = true; events.push('max_turn'); }
  return { state: s, events };
}
