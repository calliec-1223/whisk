import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { StickerArt, STICKER_ART } from './StickerArt'
import { play } from './sound'
import './Stickers.css'

// Shows a small "New sticker!" pop-up for each sticker the server says was just earned.
// It sits above the routes so it survives moving to another page.
const CelebrateContext = createContext(() => {})

export function CelebrateProvider({ children }) {
    const [queue, setQueue] = useState([])

    const celebrate = useCallback((keys) => {
        if (!keys || keys.length === 0) return
        setQueue(q => [...q, ...keys])
    }, [])

    const current = queue[0]

    useEffect(() => {
        if (!current) return
        play('sticker')
        const timer = setTimeout(() => setQueue(q => q.slice(1)), 3200)
        return () => clearTimeout(timer)
    }, [current])

    return (
        <CelebrateContext.Provider value={celebrate}>
            {children}
            <div className="sticker-toast-slot" role="status">
                {current && (
                    <div className="sticker-toast" key={`${current}-${queue.length}`}>
                        <StickerArt stickerKey={current} size="small" />
                        <div>
                            <strong>New sticker!</strong>
                            <span>{STICKER_ART[current]?.name}</span>
                        </div>
                    </div>
                )}
            </div>
        </CelebrateContext.Provider>
    )
}

export function useCelebrate() {
    return useContext(CelebrateContext)
}
