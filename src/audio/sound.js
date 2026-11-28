// Sound effects and background music, synthesised with Web Audio: no audio files, nothing to load.
// Effects go through one gain, music through another; each has its own switch in Settings.
// The game tells the module when effects are allowed and how loud the music should be (createSound options).

/**
 * @param {{sfxOn: () => boolean, musicLevel: () => number}} opts
 *   sfxOn: effects allowed now (setting on, not fast-forwarding history); musicLevel: target music volume, 0 = off.
 */
export function createSound({sfxOn, musicLevel}) {
  let actx = null;
  /* Sound effects and music are synthesised with Web Audio: no audio files, nothing to load.
     Effects go through sfxOut, music through musicOut; each has its own switch in Settings. */
  let sfxOut = null, musicOut = null;
  function audio() {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = actx.createDynamicsCompressor(); comp.connect(actx.destination);
      sfxOut = actx.createGain(); sfxOut.gain.value = .9; sfxOut.connect(comp);
      musicOut = actx.createGain(); musicOut.gain.value = 0; musicOut.connect(comp);
    }
    if (actx.state === 'suspended' && !document.hidden) actx.resume();
    return actx;
  }
  function env(g, t, peak, a, d) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  function tone(t, f, d, type, peak, out = sfxOut, f2) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    env(g, t, peak, .008, d); o.connect(g).connect(out); o.start(t); o.stop(t + d + .05);
  }
  let noiseBuf = null;
  function noise(t, d, freq, peak, out = sfxOut) {
    if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate * .5, actx.sampleRate); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const n = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    n.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    env(g, t, peak, .004, d); n.connect(f).connect(g).connect(out); n.start(t); n.stop(t + d + .05);
  }
  // A plucked string (lute-like): a bright attack that mellows quickly.
  function pluck(t, f, d, peak, out = sfxOut) {
    const o = actx.createOscillator(), o2 = actx.createOscillator(), lp = actx.createBiquadFilter(), g = actx.createGain();
    o.type = 'triangle'; o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.002;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + d);
    const g2 = actx.createGain(); g2.gain.value = .25;
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(out);
    env(g, t, peak, .005, d); o.start(t); o2.start(t); o.stop(t + d + .05); o2.stop(t + d + .05);
  }
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  const SFX = {
    place: t => { tone(t, 180, .16, 'sine', .5, sfxOut, 70); noise(t, .07, 700, .35); },  // wooden knock on the table
    rotate: t => noise(t, .035, 2600, .12),
    meeple: t => { tone(t, 440, .09, 'sine', .25, sfxOut, 880); tone(t + .06, 990, .12, 'sine', .15); },
    score: t => [76, 79, 83].forEach((n, i) => pluck(t + i * .08, NOTE(n), .45, .16)),
    big: t => { [72, 76, 79, 84].forEach((n, i) => pluck(t + i * .1, NOTE(n), .6, .18)); pluck(t + .42, NOTE(88), 1, .14); },
    turn: t => { tone(t, NOTE(81), .45, 'sine', .12); tone(t + .1, NOTE(86), .55, 'sine', .09); },
    coin: t => { tone(t, 1319, .06, 'square', .04); tone(t + .06, 1760, .16, 'square', .04); },
    tap: t => noise(t, .02, 3200, .06),
    chat: t => { tone(t, 660, .07, 'sine', .09, sfxOut, 880); },
    win: t => { [[72, 0], [76, .14], [79, .28], [84, .42], [79, .62], [84, .76]].forEach(([n, d]) => pluck(t + d, NOTE(n), .7, .18)); tone(t + .76, NOTE(60), 1.4, 'triangle', .1); },
    lose: t => [[76, 0], [74, .22], [72, .44], [71, .7]].forEach(([n, d]) => pluck(t + d, NOTE(n), .8, .13)),
  };
  function beep(kind) {
    if (!SFX[kind] || !sfxOn()) return;
    try { audio(); SFX[kind](actx.currentTime + .01); } catch (_) {}
  }

  /* Background music: a calm medieval tune made up on the fly — a soft drone, a bass on the
     first beat and a lute picking notes of the D dorian scale over a four-chord loop. */
  const CHORDS = [[50, 57, 62, 65], [48, 55, 60, 64], [46, 53, 58, 62], [48, 55, 60, 67]];
  const SCALE = [62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
  let music = {on: false, timer: 0, next: 0, step: 0, note: 4};
  function musicUpdate() {
    if (!actx || !musicOut) return;
    const v = musicLevel();
    musicOut.gain.cancelScheduledValues(actx.currentTime);
    musicOut.gain.setTargetAtTime(v, actx.currentTime, .6);
    if (v && !music.on) musicStart(); else if (!v && music.on) setTimeout(() => { if (!musicLevel()) musicStop(); }, 2500);
  }
  function musicStart() {
    if (music.on) return;
    music.on = true; music.next = actx.currentTime + .1;
    const beat = 60 / 76 / 2; // eighth notes at 76 bpm
    music.timer = setInterval(() => {
      while (music.next < actx.currentTime + .6) {
        const t = music.next, bar = Math.floor(music.step / 8) % CHORDS.length, pos = music.step % 8, ch = CHORDS[bar];
        if (pos === 0) {
          tone(t, NOTE(ch[0] - 12), beat * 7, 'triangle', .5, musicOut);
          ch.slice(1).forEach(n => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = NOTE(n); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.09, t + beat * 2); g.gain.linearRampToValueAtTime(.0001, t + beat * 8); o.connect(g).connect(musicOut); o.start(t); o.stop(t + beat * 8 + .1); });
        }
        if (pos === 4) pluck(t, NOTE(ch[1]), beat * 3, .2, musicOut);
        if (Math.random() < (pos % 2 ? .35 : .7)) {
          music.note = Math.max(0, Math.min(SCALE.length - 1, music.note + [-2, -1, -1, 0, 1, 1, 2][(Math.random() * 7) | 0]));
          pluck(t, NOTE(SCALE[music.note]), beat * 2.2, .26, musicOut);
        }
        music.next += beat; music.step++;
      }
    }, 150);
  }
  function musicStop() { clearInterval(music.timer); music.on = false; }
  // Browsers start audio only after a touch; the first one also starts the music.
  document.addEventListener('pointerdown', () => { try { audio(); musicUpdate(); } catch (_) {} }, {once: true, capture: true});
  document.addEventListener('visibilitychange', () => {
    if (!actx) return;
    if (document.hidden) { musicUpdate(); actx.suspend(); } else { actx.resume(); musicUpdate(); }
  });

  return {audio, beep, musicUpdate};
}
