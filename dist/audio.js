// Original ambient music and answer cues are synthesized in the browser.
// Audio starts after a player gesture. A single button mutes music and cues.
function createSoundscape(button) {
  let context = null;
  let master = null;
  let reverb = null;
  let musicClock = null;
  let chordIndex = 0;
  let enabled = true;
  const chords = [
    [146.83, 220, 293.66, 369.99],
    [130.81, 196, 261.63, 329.63],
    [164.81, 246.94, 329.63, 392],
    [110, 164.81, 220, 293.66],
  ];
  try {
    enabled = localStorage.getItem("far-orbit-audio") !== "off";
  } catch { /* Use the default when preferences cannot be saved. */ }

  function updateButton() {
    button.textContent = enabled ? "Sound on" : "Sound off";
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? "Mute music and sound effects" : "Enable music and sound effects");
  }

  function tone(frequency, start, duration, volume, pan = 0, waveform = "sine") {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const panner = context.createStereoPanner();
    oscillator.type = waveform;
    oscillator.frequency.value = frequency;
    panner.pan.value = pan;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + Math.min(duration * .25, 2));
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(envelope).connect(panner).connect(master);
    panner.connect(reverb);
    oscillator.start(start);
    oscillator.stop(start + duration + .1);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
      panner.disconnect();
    };
  }

  function playChord() {
    if (!context || !enabled || document.hidden || context.state !== "running") return;
    const chord = chords[chordIndex++ % chords.length];
    chord.forEach((note, i) => tone(note, context.currentTime + i * .28, 13, .012, (i - 1.5) * .25));
    tone(chord[2] * 2, context.currentTime + 4, 7, .006, .6);
  }

  async function start() {
    if (!enabled) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        context = new Audio();
        master = context.createGain();
        master.gain.value = .55;
        master.connect(context.destination);
        reverb = context.createConvolver();
        const buffer = context.createBuffer(2, context.sampleRate * 2.8, context.sampleRate);
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const samples = buffer.getChannelData(channel);
          for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length) ** 3;
        }
        reverb.buffer = buffer;
        const wet = context.createGain();
        wet.gain.value = .16;
        reverb.connect(wet).connect(master);
      }
      await context.resume();
      master.gain.setTargetAtTime(document.hidden ? 0 : .55, context.currentTime, .2);
      if (!musicClock) {
        playChord();
        musicClock = window.setInterval(playChord, 9000);
      }
    } catch { /* A blocked audio device does not interrupt the round. */ }
  }

  function cue(kind) {
    if (!enabled || !context || context.state !== "running" || document.hidden) return;
    const now = context.currentTime;
    if (kind === "wrong") {
      tone(185, now, .18, .12, -.1, "triangle");
      tone(146.83, now + .09, .24, .08, .1, "triangle");
    } else {
      const notes = kind === "rare" ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
      notes.forEach((note, i) => tone(note, now + i * .065, .55, .08 - i * .012, i * .12));
    }
  }

  button.addEventListener("click", () => {
    enabled = !enabled;
    try { localStorage.setItem("far-orbit-audio", enabled ? "on" : "off"); } catch { /* Optional preference. */ }
    updateButton();
    if (enabled) void start();
    else if (master) master.gain.setTargetAtTime(0, context.currentTime, .12);
  });
  document.addEventListener("visibilitychange", () => {
    if (!master) return;
    master.gain.setTargetAtTime(enabled && !document.hidden ? .55 : 0, context.currentTime, .2);
  });
  window.addEventListener("pagehide", () => window.clearInterval(musicClock));
  updateButton();
  return { start, cue };
}
