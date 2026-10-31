// Tiny sound effects made with the Web Audio API, so there are no audio files.
// Effects are off unless the user turns them on; timer alarms always play.

const KEY = 'whisk-sounds'
let ctx = null

export function soundsOn() {
    try { return localStorage.getItem(KEY) === 'on' } catch { return false }
}

export function setSoundsOn(on) {
    try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* private mode */ }
}

// Browsers only allow audio after a click or key press. Call this from one
// (e.g. starting a timer) so a later alarm is allowed to ring.
export function unlockAudio() {
    if (!ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (!AudioCtx) return null
        ctx = new AudioCtx()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
}

function tone(freq, start, length, type = 'sine', volume = 0.12) {
    const audio = unlockAudio()
    if (!audio) return
    const t = audio.currentTime + start
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
    osc.connect(gain).connect(audio.destination)
    osc.start(t)
    osc.stop(t + length + 0.02)
}

const SOUNDS = {
    pop: () => { tone(660, 0, 0.08, 'triangle'); tone(990, 0.03, 0.08, 'triangle', 0.07) },
    step: () => tone(784, 0, 0.14, 'sine', 0.1),
    sticker: () => [880, 1109, 1319, 1760].forEach((f, i) => tone(f, i * 0.07, 0.2, 'triangle', 0.09)),
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, i === 3 ? 0.5 : 0.16, 'triangle', 0.12)),
    alarm: () => [0, 0.35, 0.7, 1.05].forEach(s => { tone(1047, s, 0.15, 'square', 0.05); tone(1319, s + 0.15, 0.15, 'square', 0.05) }),
}

export function play(name) {
    if (name !== 'alarm' && !soundsOn()) return
    try { SOUNDS[name]?.() } catch { /* audio not available */ }
}
