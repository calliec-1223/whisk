import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { authFetch } from './api'
import { useCelebrate } from './Celebrate'
import { Medal, TimerIcon } from './icons'
import PageHeader from './PageHeader'
import { play } from './sound'
import { formatTime, useTimers } from './Timers'
import './Bake.css'

// "11 to 12 minutes", "1 hour", "30 seconds" -> timer lengths in minutes.
// For a range we use the low end, since that's when to start checking.
const TIME_RE = /(\d+(?:\.\d+)?)(?:\s*(?:to|-|–)\s*\d+(?:\.\d+)?)?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi

export function findTimes(text) {
    const found = []
    for (const match of text.matchAll(TIME_RE)) {
        const amount = parseFloat(match[1])
        const unit = match[2].toLowerCase()
        const minutes = unit.startsWith('h') ? amount * 60 : unit.startsWith('s') ? amount / 60 : amount
        if (minutes > 0 && !found.some(f => f.minutes === minutes)) found.push({ minutes })
    }
    return found
}

const timerName = (minutes) => (minutes >= 60 && minutes % 60 === 0
    ? `${minutes / 60} hr`
    : minutes < 1 ? `${Math.round(minutes * 60)} sec` : `${minutes} min`)

const MEDAL_CHOICES = [
    { medal: 'bronze', label: "It's okay" },
    { medal: 'silver', label: 'Pretty good' },
    { medal: 'gold', label: 'Perfect!' },
]

function Bake() {
    const { id } = useParams()
    const location = useLocation()
    const celebrate = useCelebrate()
    const { timers, now, addTimer } = useTimers()

    const [recipe, setRecipe] = useState(location.state?.recipe || null)
    const [notFound, setNotFound] = useState(false)
    const [phase, setPhase] = useState('prep') // prep -> steps -> finish
    const [ready, setReady] = useState({})
    const [stepIndex, setStepIndex] = useState(0)
    const [stepTimers, setStepTimers] = useState({}) // "step-minutes" -> timer id
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (recipe) return
        authFetch(`/recipes/${id}`)
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then(setRecipe)
            .catch(() => setNotFound(true))
    }, [id, recipe])

    const ingredients = recipe ? recipe.ingredients.split('\n').filter(Boolean) : []
    const steps = recipe ? recipe.steps.split('\n').filter(Boolean) : []
    const readyCount = ingredients.filter((_, i) => ready[i]).length
    const allReady = readyCount === ingredients.length
    const lastStep = stepIndex === steps.length - 1

    const goToStep = (i) => {
        setStepIndex(i)
        play('step')
    }
    const nextStep = () => (lastStep ? setPhase('finish') : goToStep(stepIndex + 1))
    const prevStep = () => stepIndex > 0 && goToStep(stepIndex - 1)

    // Arrow keys move between steps
    useEffect(() => {
        if (phase !== 'steps') return
        const onKey = (e) => {
            if (e.target instanceof Element && e.target.closest('input, textarea, select')) return
            if (e.key === 'ArrowRight') nextStep()
            if (e.key === 'ArrowLeft') prevStep()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    })

    const toggleReady = (i) => {
        if (!ready[i]) play('pop')
        setReady({ ...ready, [i]: !ready[i] })
    }

    const startStepTimer = (minutes) => {
        const label = `Step ${stepIndex + 1}: ${steps[stepIndex]}`
        const timerId = addTimer(minutes, label)
        setStepTimers({ ...stepTimers, [`${stepIndex}-${minutes}`]: timerId })
    }

    const saveBake = (medal) => {
        setSaving(true)
        setError('')
        authFetch(`/recipes/${recipe.id}/bakes`, { method: 'POST', body: JSON.stringify({ medal }) })
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok) throw new Error(data.error)
                play('fanfare')
                setResult({ medal, count: data.bake_count })
                celebrate(data.new_stickers)
            })
            .catch(() => setError("Couldn't save your bake. Please try again."))
            .finally(() => setSaving(false))
    }

    if (notFound) return <Navigate to="/recipes" />
    if (!recipe) {
        return (
            <div className="recipes-container">
                <p className="muted">Getting your recipe…</p>
            </div>
        )
    }

    return (
        <div className="page-enter bake-page">
            <div className="recipes-container">
                <PageHeader title="Let's bake!" meta={recipe.title} />

                {phase === 'prep' && (
                    <section className="bake-card" aria-labelledby="prep-title">
                        <h2 id="prep-title">Gather your ingredients</h2>
                        <p className="bake-hint">Tick each one off as you set it out.</p>
                        <ul className="prep-list">
                            {ingredients.map((ing, i) => (
                                <li key={i}>
                                    <label className={ready[i] ? 'ready' : ''}>
                                        <input type="checkbox" checked={!!ready[i]} onChange={() => toggleReady(i)} />
                                        <span>{ing}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                        <div className="bake-nav">
                            <span className="bake-count" id="prep-status">
                                {allReady ? 'All set out. Ready to bake!' : `${readyCount} of ${ingredients.length} ready`}
                            </span>
                            <button
                                type="button"
                                disabled={!allReady}
                                aria-describedby="prep-status"
                                onClick={() => { setPhase('steps'); play('step') }}
                            >
                                Start baking
                            </button>
                        </div>
                    </section>
                )}

                {phase === 'steps' && (
                    <section className="bake-card" aria-labelledby="step-title">
                        <ol className="step-progress" aria-hidden="true">
                            {steps.map((_, i) => (
                                <li key={i} className={i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''} />
                            ))}
                        </ol>
                        <p className="bake-count" id="step-title">Step {stepIndex + 1} of {steps.length}</p>
                        <p className="step-big" aria-live="polite">
                            <span className="step-badge">{stepIndex + 1}</span>
                            <span>{steps[stepIndex]}</span>
                        </p>

                        {findTimes(steps[stepIndex]).map(({ minutes }) => {
                            const timer = timers.find(t => t.id === stepTimers[`${stepIndex}-${minutes}`])
                            if (timer) {
                                return (
                                    <p key={minutes} className={`step-timer${timer.done ? ' done' : ''}`}>
                                        <TimerIcon size={18} />
                                        {timer.done ? 'Time’s up!' : `${formatTime(timer.endsAt - now)} left`}
                                    </p>
                                )
                            }
                            return (
                                <button key={minutes} type="button" className="rb-ghost step-timer-btn"
                                        onClick={() => startStepTimer(minutes)}>
                                    <TimerIcon size={18} /> Start {timerName(minutes)} timer
                                </button>
                            )
                        })}

                        <div className="bake-nav">
                            <button type="button" className="rb-ghost" disabled={stepIndex === 0} onClick={prevStep}>
                                Back
                            </button>
                            <button type="button" onClick={nextStep}>
                                {lastStep ? 'Finish!' : 'Next step'}
                            </button>
                        </div>
                    </section>
                )}

                {phase === 'finish' && !result && (
                    <section className="bake-card finish-card" aria-labelledby="finish-title">
                        <h2 id="finish-title">Great job!</h2>
                        <p className="bake-hint">How did it turn out?</p>
                        <div className="medal-choices">
                            {MEDAL_CHOICES.map(({ medal, label }) => (
                                <button key={medal} type="button" className="medal-choice" disabled={saving}
                                        onClick={() => saveBake(medal)}>
                                    <Medal medal={medal} size={52} />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                        {error && <p className="form-error">{error}</p>}
                        <button type="button" className="rb-text-button" onClick={() => setPhase('steps')}>
                            Back to the steps
                        </button>
                    </section>
                )}

                {result && (
                    <section className="bake-card finish-card" aria-labelledby="result-title">
                        <Medal medal={result.medal} size={96} className="medal-pop" />
                        <h2 id="result-title">
                            {result.medal === 'gold' ? 'Perfect bake!' : result.medal === 'silver' ? 'Nicely done!' : 'Every bake counts!'}
                        </h2>
                        <p className="bake-hint">
                            {result.count === 1
                                ? `That was your first time baking ${recipe.title}!`
                                : `You've baked ${recipe.title} ${result.count} times.`}
                        </p>
                        <Link to="/recipes" className="rb-button">Back to my recipe book</Link>
                    </section>
                )}
            </div>
        </div>
    )
}

export default Bake
