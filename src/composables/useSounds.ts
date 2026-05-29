let _ctx: AudioContext | null = null

const getCtx = (): AudioContext => {
  if (!_ctx) _ctx = new AudioContext()
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {})
  return _ctx
}

const DTMF: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
}

const tone = (ctx: AudioContext, freq: number, startTime: number, endTime: number, vol = 0.08): void => {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(vol, startTime)
  gain.gain.setValueAtTime(0, endTime - 0.005)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(endTime)
}

export const playDTMF = (key: string): void => {
  const freqs = DTMF[key]
  if (!freqs) return
  const ctx = getCtx()
  const now = ctx.currentTime
  freqs.forEach(freq => tone(ctx, freq, now, now + 0.12))
}

const loopTone = (freqs: number[], onMs: number, offMs: number): (() => void) => {
  let active = true
  const onS = onMs / 1000
  const offS = offMs / 1000
  const tick = () => {
    if (!active) return
    const ctx = getCtx()
    const now = ctx.currentTime
    freqs.forEach(freq => tone(ctx, freq, now, now + onS))
    setTimeout(tick, (onS + offS) * 1000)
  }
  tick()
  return () => { active = false }
}

export const startRing     = (): (() => void) => loopTone([440, 480], 1000, 3000)
export const startRingback = (): (() => void) => loopTone([440, 480], 2000, 4000)

export const playHangup = (): void => {
  const ctx = getCtx()
  const now = ctx.currentTime
  ;[480, 620].forEach(freq => tone(ctx, freq, now, now + 0.3, 0.06))
}
