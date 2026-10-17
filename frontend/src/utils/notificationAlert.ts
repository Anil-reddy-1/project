/**
 * Notification alert helpers — a short tune (Web Audio API, no asset file)
 * and device vibration, used to grab attention when a new order notification
 * arrives for supervisors and delivery partners.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a loud, attention-grabbing repeating chime using an oscillator stack
 * (two detuned square-ish tones per note for extra loudness/presence).
 */
export function playNotificationTune(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const notes = [988, 1318.5, 988, 1318.5]; // B5 -> E6, repeated twice, urgent "ding-ding-ding-ding"
    const now = ctx.currentTime;
    const peakGain = 0.9; // loud — near max before clipping/distortion

    notes.forEach((freq, i) => {
      const start = now + i * 0.22;

      // Two layered oscillators per note for a fuller, louder sound
      [freq, freq * 2].forEach((f, layer) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = layer === 0 ? 'square' : 'sine';
        osc.frequency.value = f;

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(layer === 0 ? peakGain : peakGain * 0.4, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.42);
      });
    });
  } catch {
    // Ignore — audio is a nice-to-have, never block on it
  }
}

/**
 * Vibrates the device if the Vibration API is supported (mobile browsers).
 * Strong, long, repeating pattern so it's impossible to miss.
 */
export function vibrateDevice(
  pattern: number | number[] = [400, 150, 400, 150, 400, 150, 400],
): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore unsupported environments
  }
}

/**
 * Fires both the tune and vibration together — used when a new order
 * notification needs to actively grab a supervisor's or delivery partner's attention.
 */
export function alertNewOrder(): void {
  playNotificationTune();
  vibrateDevice();
}
