import { useEffect, useState } from 'react'
import { authFetch } from './api'
import PageHeader from './PageHeader'
import { StickerArt } from './StickerArt'
import './Stickers.css'

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function StickerBook() {
    const [stickers, setStickers] = useState(null)

    useEffect(() => {
        authFetch('/stickers')
            .then(res => res.json())
            .then(data => setStickers(Array.isArray(data) ? data : []))
            .catch(() => setStickers([]))
    }, [])

    const earnedCount = stickers ? stickers.filter(s => s.earned_at).length : 0

    return (
        <div className="page-enter sticker-page">
            <div className="recipes-container">
                <PageHeader
                    title="Sticker book"
                    meta={stickers ? `${earnedCount} of ${stickers.length} collected` : 'Opening your sticker book…'}
                />
                {stickers && (
                    <ul className="sticker-grid">
                        {stickers.map((s, i) => (
                            <li key={s.key} className={`sticker-slot${s.earned_at ? ' earned' : ''}`}>
                                {s.earned_at
                                    ? <span className="sticker-tilt" style={{ '--tilt': `${(i % 3) * 5 - 5}deg` }}>
                                          <StickerArt stickerKey={s.key} />
                                      </span>
                                    : <span className="sticker-empty" aria-hidden="true">?</span>}
                                <h2>{s.name}</h2>
                                <p>{s.earned_at ? `Earned ${dateFormat.format(new Date(s.earned_at))}` : s.how}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

export default StickerBook
