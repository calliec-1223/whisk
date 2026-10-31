import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { TimerIcon } from './icons'
import { play, unlockAudio } from './sound'
import './Timers.css'

// Kitchen timers shared by the floating timer and cooking-mode step timers.
// The provider sits above the routes, so timers keep running between pages.
const TimerContext = createContext(null)

const pad = (n) => String(n).padStart(2, '0')

export function formatTime(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function TimerProvider({ children }) {
    // { id, label, endsAt, done }
    const [timers, setTimers] = useState([])
    const [now, setNow] = useState(Date.now())
    const anyRunning = timers.some(t => !t.done)

    useEffect(() => {
        if (!anyRunning) return
        const tick = setInterval(() => setNow(Date.now()), 250)
        return () => clearInterval(tick)
    }, [anyRunning])

    // Ring once for timers that just ran out
    useEffect(() => {
        if (!timers.some(t => !t.done && t.endsAt <= now)) return
        play('alarm')
        setTimers(ts => ts.map(t => (!t.done && t.endsAt <= now ? { ...t, done: true } : t)))
    }, [now, timers])

    const addTimer = useCallback((minutes, label) => {
        unlockAudio() // called from a click, so the alarm is allowed to ring later
        const id = `${Date.now()}-${Math.random()}`
        const start = Date.now()
        setTimers(ts => [...ts, { id, label, endsAt: start + minutes * 60000, done: false }])
        setNow(start)
        return id
    }, [])

    const removeTimer = useCallback((id) => setTimers(ts => ts.filter(t => t.id !== id)), [])

    return (
        <TimerContext.Provider value={{ timers, now, addTimer, removeTimer }}>
            {children}
        </TimerContext.Provider>
    )
}

export function useTimers() {
    return useContext(TimerContext)
}

const QUICK_MINUTES = [1, 5, 10, 15]

// Floating kitchen timer, bottom left of every logged-in page
export function KitchenTimer() {
    const { timers, now, addTimer, removeTimer } = useTimers()
    const [open, setOpen] = useState(false)
    const [custom, setCustom] = useState('')

    const running = timers.filter(t => !t.done).sort((a, b) => a.endsAt - b.endsAt)
    const ringing = timers.some(t => t.done)
    const next = running[0]

    const startCustom = () => {
        const minutes = Number(custom)
        if (!(minutes > 0 && minutes <= 600)) return
        addTimer(minutes, `${minutes} min timer`)
        setCustom('')
    }

    let fabLabel = 'Timer'
    if (ringing) fabLabel = 'Done!'
    else if (next) fabLabel = formatTime(next.endsAt - now)

    return (
        <>
            <button
                type="button"
                className={`timer-fab${ringing ? ' ringing' : ''}${next ? ' running' : ''}`}
                aria-expanded={open}
                aria-label={`Kitchen timer: ${fabLabel}`}
                onClick={() => setOpen(!open)}
            >
                <TimerIcon size={20} />
                <span>{fabLabel}</span>
            </button>

            {open && (
                <div className="timer-panel" role="dialog" aria-label="Kitchen timer">
                    <h3>Kitchen timer</h3>
                    {timers.length === 0
                        ? <p className="timer-empty">No timers running.</p>
                        : (
                            <ul className="timer-list">
                                {timers.map(t => (
                                    <li key={t.id} className={t.done ? 'done' : ''}>
                                        <span className="timer-label">{t.label}</span>
                                        <span className="timer-time">{t.done ? 'Done!' : formatTime(t.endsAt - now)}</span>
                                        <button type="button" className="rb-ghost timer-remove" onClick={() => removeTimer(t.id)}>
                                            {t.done ? 'Dismiss' : 'Stop'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    <p className="timer-start-label">Start a timer</p>
                    <div className="timer-quick">
                        {QUICK_MINUTES.map(m => (
                            <button key={m} type="button" className="rb-ghost" onClick={() => addTimer(m, `${m} min timer`)}>
                                {m} min
                            </button>
                        ))}
                    </div>
                    <div className="timer-custom">
                        <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max="600"
                            placeholder="Minutes"
                            aria-label="Custom timer in minutes"
                            value={custom}
                            onChange={(e) => setCustom(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && startCustom()}
                        />
                        <button type="button" onClick={startCustom}>Start</button>
                    </div>
                </div>
            )}
        </>
    )
}
