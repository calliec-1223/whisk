import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from './api'
import { useCelebrate } from './Celebrate'
import { CategoryIcon } from './icons'
import { play } from './sound'
import './Spinner.css'

const SLICE_COLORS = {
    cookies: '#ffe3a3', cakes: '#ffd3d8', bread: '#f2dcbc', muffins: '#d7def7',
    pies: '#ffd6bb', pastry: '#e7d8f2', 'no-bake': '#d4eedb', other: '#d6ebf3',
}
const MAX_SLICES = 10
const SPIN_MS = 3200
const R = 92

const shuffle = (list) => {
    const copy = [...list]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

// Point on the wheel, measured clockwise from the top
const point = (deg, r) => {
    const rad = (deg * Math.PI) / 180
    return [r * Math.sin(rad), -r * Math.cos(rad)]
}

function SpinnerModal({ recipes, onClose }) {
    const navigate = useNavigate()
    const celebrate = useCelebrate()
    const pool = useMemo(() => shuffle(recipes).slice(0, MAX_SLICES), [recipes])
    const [angle, setAngle] = useState(0)
    const [spinning, setSpinning] = useState(false)
    const [picked, setPicked] = useState(null)
    const claimed = useRef(false)

    const n = pool.length
    const slice = 360 / n

    const spin = () => {
        const i = Math.floor(Math.random() * n)
        const centre = i * slice + slice / 2
        // Turn a few full times, then stop with slice i under the pointer at the top
        const target = Math.ceil(angle / 360) * 360 + 5 * 360 + (360 - centre)
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        setAngle(target)
        setSpinning(true)
        setPicked(null)
        play('step')
        setTimeout(() => {
            setSpinning(false)
            setPicked(pool[i])
            play('fanfare')
            if (!claimed.current) {
                claimed.current = true
                authFetch('/stickers/claim', { method: 'POST', body: JSON.stringify({ key: 'spinner' }) })
                    .then(res => res.json())
                    .then(data => celebrate(data.new_stickers))
                    .catch(() => {})
            }
        }, reduceMotion ? 0 : SPIN_MS)
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal spinner-modal" role="dialog" aria-modal="true" aria-labelledby="spinner-title"
                 onClick={(e) => e.stopPropagation()}>
                <h2 id="spinner-title">What should I bake?</h2>

                <div className="wheel-wrap">
                    <svg className="wheel-pointer" viewBox="0 0 28 24" aria-hidden="true">
                        <path d="M3 3h22L14 21z" fill="#c8463d" stroke="#4f3328" strokeWidth="2.5" strokeLinejoin="round" />
                    </svg>
                    <svg className="wheel" viewBox="-100 -100 200 200" aria-hidden="true"
                         style={{ transform: `rotate(${angle}deg)`, transitionDuration: `${SPIN_MS}ms` }}>
                        {pool.map((r, i) => {
                            const cat = SLICE_COLORS[r.category] ? r.category : 'other'
                            const mid = i * slice + slice / 2
                            const [x1, y1] = point(i * slice, R)
                            const [x2, y2] = point((i + 1) * slice, R)
                            return (
                                <g key={r.id}>
                                    {n === 1
                                        ? <circle r={R} fill={SLICE_COLORS[cat]} />
                                        : <path d={`M0 0 L${x1} ${y1} A${R} ${R} 0 ${slice > 180 ? 1 : 0} 1 ${x2} ${y2} Z`}
                                                fill={SLICE_COLORS[cat]} stroke="#4f3328" strokeWidth="2" strokeLinejoin="round" />}
                                    <g transform={`rotate(${mid}) translate(0 -60) rotate(${-mid}) translate(-12 -12)`}
                                       style={{ color: '#4f3328' }}>
                                        <CategoryIcon cat={cat} size={24} />
                                    </g>
                                </g>
                            )
                        })}
                        <circle r={R} fill="none" stroke="#4f3328" strokeWidth="3" />
                        <circle r="13" fill="#fffdf7" stroke="#4f3328" strokeWidth="3" />
                    </svg>
                </div>

                <div className="spinner-result" aria-live="polite">
                    {spinning && <p className="muted">Spinning…</p>}
                    {picked && (
                        <>
                            <p className="muted">How about…</p>
                            <p className="picked-title">{picked.title}!</p>
                        </>
                    )}
                </div>

                <div className="spinner-actions">
                    {picked && (
                        <button type="button" onClick={() => navigate(`/bake/${picked.id}`, { state: { recipe: picked } })}>
                            Let's bake it!
                        </button>
                    )}
                    <button type="button" className={picked ? 'rb-ghost' : ''} disabled={spinning} onClick={spin}>
                        {picked ? 'Spin again' : 'Spin the wheel'}
                    </button>
                    <button type="button" className="rb-text-button" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    )
}

export default SpinnerModal
