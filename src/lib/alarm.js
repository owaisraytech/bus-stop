// Sound needs a tap before it can play on phones, so unlockAudio() runs on
// the tap that starts a trip.
let ctx = null;

export function unlockAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx = ctx || new Ctx();
    if (ctx.state === 'suspended') ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* no sound available */
  }
}

function chime() {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  [880, 1175, 1568].forEach((freq, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const at = t + i * 0.22;
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.6, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start(at);
    o.stop(at + 0.42);
  });
}

function buzz() {
  try { navigator.vibrate?.([400, 150, 400, 150, 400]); } catch { /* unsupported */ }
}

export function testAlert() {
  unlockAudio();
  chime();
  buzz();
}

// Repeats until the returned function is called.
export function startAlarm() {
  chime();
  buzz();
  const id = setInterval(() => { chime(); buzz(); }, 3500);
  return () => {
    clearInterval(id);
    try { navigator.vibrate?.(0); } catch { /* unsupported */ }
  };
}
