import { BasketIcon, BookIcon, CategoryIcon, Medal, StarIcon, WheelIcon, WhiskIcon } from './icons'

// Art for each sticker. Names match the server's sticker catalog.
export const STICKER_ART = {
    'first-recipe': { name: 'First recipe', color: '#ffd3d8', art: size => <BookIcon size={size} /> },
    'recipe-5': { name: 'Recipe collector', color: '#ffe3a3', art: size => <CategoryIcon cat="cookies" size={size} /> },
    'recipe-10': { name: 'Full cookbook', color: '#e7d8f2', art: size => <BookIcon size={size} /> },
    'first-bake': { name: 'First bake', color: '#ffd6bb', art: size => <WhiskIcon size={size} /> },
    'bake-10': { name: 'Busy baker', color: '#d7def7', art: size => <CategoryIcon cat="muffins" size={size} /> },
    'first-gold': { name: 'Gold medal', color: '#fff0d6', art: size => <Medal medal="gold" size={size} /> },
    'gold-3': { name: 'Triple gold', color: '#ffe3a3', art: size => <StarIcon size={size} /> },
    'variety': { name: 'Variety baker', color: '#d4eedb', art: size => <CategoryIcon cat="cakes" size={size} /> },
    'shopping-list': { name: 'Ready to shop', color: '#d6ebf3', art: size => <BasketIcon size={size} /> },
    'spinner': { name: 'Let the wheel decide', color: '#e7d8f2', art: size => <WheelIcon size={size} /> },
}

// A round die-cut sticker
export function StickerArt({ stickerKey, size = 'large' }) {
    const info = STICKER_ART[stickerKey]
    if (!info) return null
    return (
        <span className={`sticker sticker-${size}`} style={{ '--sticker-bg': info.color }} aria-hidden="true">
            {info.art(size === 'large' ? 40 : 24)}
        </span>
    )
}
