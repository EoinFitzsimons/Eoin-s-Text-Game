/* Verge City — synthesised sound cues.
   Everything here is generated with the Web Audio API; there are no audio files.
   The AudioContext is created lazily on the first user gesture so browsers do not block it. */
(function () {
  const STORAGE_KEY = "vergeCity.muted";
  let ctx = null;
  let master = null;
  let muted = false;
  try { muted = localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) { muted = false; }

  function ensure() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    return ctx;
  }

  function tone({ type = "square", freq = 440, to = null, dur = 0.08, gain = 0.3, at = 0, slide = false }) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + at;
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== null) {
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
      else osc.frequency.setValueAtTime(to, t0 + dur / 2);
    }
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.2, gain = 0.4, cutoff = 1200, at = 0 }) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + at;
    const frames = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, frames, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, t0);
    filter.frequency.exponentialRampToValueAtTime(80, t0 + dur);
    const env = c.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(env).connect(master);
    src.start(t0);
  }

  const Sound = {
    get muted() { return muted; },
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem(STORAGE_KEY, muted ? "1" : "0"); } catch (e) { /* storage unavailable */ }
      if (!muted) Sound.select();
      return muted;
    },
    /* a very short click for each typed character */
    tick() {
      tone({ type: "square", freq: 1800 + Math.random() * 900, dur: 0.018, gain: 0.05 });
    },
    /* menu / choice confirmation */
    select() {
      tone({ type: "square", freq: 660, to: 990, dur: 0.07, gain: 0.18 });
    },
    /* picking up an item: rising three-note arpeggio */
    pickup() {
      tone({ type: "triangle", freq: 523, dur: 0.09, gain: 0.25 });
      tone({ type: "triangle", freq: 659, dur: 0.09, gain: 0.25, at: 0.08 });
      tone({ type: "triangle", freq: 1046, dur: 0.16, gain: 0.25, at: 0.16 });
    },
    /* spending or losing an item */
    drop() {
      tone({ type: "triangle", freq: 659, dur: 0.08, gain: 0.2 });
      tone({ type: "triangle", freq: 440, dur: 0.14, gain: 0.2, at: 0.08 });
    },
    /* taking damage: a noise burst plus a falling saw */
    damage() {
      noise({ dur: 0.22, gain: 0.5, cutoff: 1600 });
      tone({ type: "sawtooth", freq: 220, to: 55, dur: 0.3, gain: 0.3, slide: true });
    },
    /* healing */
    heal() {
      tone({ type: "sine", freq: 392, to: 587, dur: 0.25, gain: 0.25, slide: true });
    },
    /* a check failed or something went wrong */
    fail() {
      tone({ type: "square", freq: 220, dur: 0.12, gain: 0.2 });
      tone({ type: "square", freq: 164, dur: 0.22, gain: 0.2, at: 0.12 });
    },
    /* a quest beat or ending */
    success() {
      [523, 659, 784, 1046].forEach((f, i) => tone({ type: "triangle", freq: f, dur: 0.22, gain: 0.22, at: i * 0.11 }));
    },
    /* credits */
    coins() {
      tone({ type: "square", freq: 1568, dur: 0.05, gain: 0.12 });
      tone({ type: "square", freq: 2093, dur: 0.08, gain: 0.12, at: 0.06 });
    }
  };

  window.Sound = Sound;
})();
