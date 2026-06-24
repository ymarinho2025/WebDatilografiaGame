let ctx: AudioContext | null = null;
let suspenseTimer: number | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

export function unlockAudio(): void {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") {
    void audio.resume();
  }
}

export function beep(frequency: number, durationMs = 40, volume = 0.04): void {
  const audio = getContext();
  if (!audio) return;

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;

  oscillator.connect(gain);
  gain.connect(audio.destination);

  oscillator.start();
  oscillator.stop(audio.currentTime + durationMs / 1000);
}

export function playKey(): void {
  beep(1180 + Math.random() * 180, 22, 0.035);
}

export function playSpace(): void {
  beep(760, 28, 0.035);
}

export function playError(): void {
  beep(260, 140, 0.06);
}

export function playSuccess(): void {
  beep(1450, 55, 0.045);
  window.setTimeout(() => beep(1880, 65, 0.045), 70);
}

export function playReturn(): void {
  beep(980, 35, 0.04);
  window.setTimeout(() => beep(740, 35, 0.04), 45);
  window.setTimeout(() => beep(520, 45, 0.04), 90);
}

export function playRouletteTick(): void {
  beep(700 + Math.random() * 160, 16, 0.035);
}

export function playLifeLoss(): void {
  beep(220, 140, 0.07);
  window.setTimeout(() => beep(530, 160, 0.06), 95);
}

export function startSuspenseLoop(): void {
  if (typeof window === "undefined") return;
  if (suspenseTimer !== null) return;

  suspenseTimer = window.setInterval(() => {
    beep(175 + Math.random() * 20, 90, 0.018);
  }, 2600);
}

export function stopSuspenseLoop(): void {
  if (typeof window === "undefined") return;
  if (suspenseTimer !== null) {
    window.clearInterval(suspenseTimer);
    suspenseTimer = null;
  }
}
