import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CategoryIcon, ChevronIcon, Medal, MEDAL_NAMES } from './icons'
import { CATEGORIES } from './categories'
import './RecipeIndex.css'

export const categoryLabel = (value) => CATEGORIES.find(c => c.value === value)?.label
export const cardCategory = (recipe) => (categoryLabel(recipe.category) ? recipe.category : 'other')

const BEHIND = 4        // cards drawn behind the front one
const WHEEL_STEP = 60   // wheel distance that flips one card
const SWIPE_STEP = 40   // finger distance that flips one card

// Recipes sorted into category sections, each led by a divider card
export function buildCards(recipes) {
    return CATEGORIES.flatMap(c => {
        const inCat = recipes
            .filter(r => cardCategory(r) === c.value)
            .sort((a, b) => a.title.localeCompare(b.title))
        if (inCat.length === 0) return []
        return [
            { key: `d-${c.value}`, divider: true, cat: c.value, label: c.label, count: inCat.length },
            ...inCat.map(r => ({ key: String(r.id), recipe: r, cat: c.value })),
        ]
    })
}

// A box of index cards seen from the front. The front card can be pulled out;
// the ones behind show their top edge. Scroll, swipe or use the arrow keys to flip.
function RecipeIndex({ cards, current, onFlip, openKey, arrivingKey, selected, onToggleSelect, footer, empty }) {
    const wellRef = useRef(null)
    const flipRef = useRef(onFlip)
    flipRef.current = onFlip
    const countRef = useRef(cards.length)
    countRef.current = cards.length
    const currentRef = useRef(current)
    currentRef.current = current

    // Wheel and swipe flip through cards instead of scrolling the page.
    // The listeners are added by hand so the wheel one can call preventDefault.
    useEffect(() => {
        const well = wellRef.current
        if (!well) return
        let wheelSum = 0
        let swipeY = null
        const go = (by) => {
            const next = Math.max(0, Math.min(countRef.current - 1, currentRef.current + by))
            if (next !== currentRef.current) flipRef.current(next)
        }
        let lastFlip = 0
        const onWheel = (e) => {
            e.preventDefault()
            // Trackpads send a burst of small events; flip at most one card per beat
            if (e.timeStamp - lastFlip < 90) return
            wheelSum += e.deltaY
            if (Math.abs(wheelSum) >= WHEEL_STEP) {
                go(Math.sign(wheelSum))
                wheelSum = 0
                lastFlip = e.timeStamp
            }
        }
        const onTouchStart = (e) => { swipeY = e.touches[0].clientY }
        const onTouchMove = (e) => {
            if (swipeY === null) return
            e.preventDefault()
            const moved = swipeY - e.touches[0].clientY
            if (Math.abs(moved) >= SWIPE_STEP) {
                go(Math.sign(moved))
                swipeY = e.touches[0].clientY
            }
        }
        const onTouchEnd = () => { swipeY = null }
        well.addEventListener('wheel', onWheel, { passive: false })
        well.addEventListener('touchstart', onTouchStart, { passive: true })
        well.addEventListener('touchmove', onTouchMove, { passive: false })
        well.addEventListener('touchend', onTouchEnd)
        return () => {
            well.removeEventListener('wheel', onWheel)
            well.removeEventListener('touchstart', onTouchStart)
            well.removeEventListener('touchmove', onTouchMove)
            well.removeEventListener('touchend', onTouchEnd)
        }
    }, [])

    const onKeyDown = (e) => {
        const moves = { ArrowDown: 1, ArrowRight: 1, PageDown: BEHIND, ArrowUp: -1, ArrowLeft: -1, PageUp: -BEHIND }
        if (e.key === 'Home') onFlip(0)
        else if (e.key === 'End') onFlip(cards.length - 1)
        else if (moves[e.key]) onFlip(Math.max(0, Math.min(cards.length - 1, current + moves[e.key])))
        else return
        e.preventDefault()
    }

    const front = cards[current]
    const recipeCount = cards.filter(c => !c.divider).length
    const position = front && !front.divider
        ? cards.slice(0, current + 1).filter(c => !c.divider).length
        : 0

    return (
        <div className="index-box">
            <div
                ref={wellRef}
                className="index-well"
                tabIndex={cards.length ? 0 : -1}
                role="group"
                aria-label="Recipe index. Use the arrow keys to flip through cards."
                onKeyDown={onKeyDown}
            >
                {cards.length === 0 && <div className="index-card index-card-empty front">{empty}</div>}
                {cards.map((card, i) => {
                    const k = i - current
                    if (k < -2 || k > BEHIND + 1) return null
                    const isFront = k === 0
                    const classes = [
                        'index-card',
                        card.divider ? 'index-divider' : '',
                        isFront ? 'front' : '',
                        k < 0 ? 'flipped' : '',
                        k > BEHIND ? 'hidden' : '',
                        card.key === openKey ? 'pulled' : '',
                        card.key === arrivingKey ? 'arriving' : '',
                    ].filter(Boolean).join(' ')
                    const tabOffset = CATEGORIES.findIndex(c => c.value === card.cat)
                    return (
                        <div
                            key={card.key}
                            className={classes}
                            data-cat={card.cat}
                            data-depth={k}
                            style={{ '--k': Math.max(k, 0), '--z': k < 0 ? 200 + k : 100 - k, '--tab': tabOffset }}
                            aria-hidden={!isFront}
                            onClick={isFront ? undefined : () => onFlip(i)}
                        >
                            {card.divider ? (
                                <>
                                    <span className="divider-tab">
                                        <CategoryIcon cat={card.cat} size={15} />
                                        {card.label}
                                    </span>
                                    <div className="divider-face">
                                        <span className="sticker sticker-large" aria-hidden="true">
                                            <CategoryIcon cat={card.cat} size={34} />
                                        </span>
                                        <p>
                                            <strong>{card.label}</strong>
                                            <span>{card.count} {card.count === 1 ? 'recipe' : 'recipes'}</span>
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <RecipeFace
                                    recipe={card.recipe}
                                    isFront={isFront}
                                    isOpen={card.key === openKey}
                                    checked={selected.some(r => r.id === card.recipe.id)}
                                    onToggle={() => onToggleSelect(card.recipe)}
                                />
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="index-wall">
                <div className="index-flip">
                    <button
                        type="button"
                        className="flip-btn"
                        aria-label="Previous card"
                        disabled={current <= 0}
                        onClick={() => onFlip(current - 1)}
                    >
                        <ChevronIcon className="chev-up" />
                    </button>
                    <span className="index-count" aria-live="polite">
                        {front?.divider
                            ? `${front.label}`
                            : recipeCount > 0 ? `${position} of ${recipeCount}` : ''}
                    </span>
                    <button
                        type="button"
                        className="flip-btn"
                        aria-label="Next card"
                        disabled={current >= cards.length - 1}
                        onClick={() => onFlip(current + 1)}
                    >
                        <ChevronIcon />
                    </button>
                </div>
                {footer}
            </div>
        </div>
    )
}

function RecipeFace({ recipe, isFront, isOpen, checked, onToggle }) {
    return (
        <>
            <div className="ic-head">
                <span className="ic-dot" aria-hidden="true">
                    <CategoryIcon cat={cardCategory(recipe)} size={16} />
                </span>
                <h3>
                    {isFront ? (
                        // The link covers the whole card (see .card-link::after)
                        <Link to={`/recipes/${recipe.id}`} className="card-link">{recipe.title}</Link>
                    ) : recipe.title}
                </h3>
                {recipe.bake_count > 0 && <Medal medal={recipe.best_medal} size={22} />}
            </div>
            <div className="ic-lines">
                {isOpen ? (
                    <p className="ic-out">Pulled out to read</p>
                ) : (
                    <>
                        <p className="ic-meta">
                            <span className="chip" data-cat={cardCategory(recipe)}>
                                {categoryLabel(cardCategory(recipe))}
                            </span>
                            <span>Serves {recipe.servings}</span>
                        </p>
                        {recipe.bake_count > 0 && (
                            <p className="ic-baked">
                                <span className="visually-hidden">Best result: {MEDAL_NAMES[recipe.best_medal]}. </span>
                                Baked {recipe.bake_count} {recipe.bake_count === 1 ? 'time' : 'times'}
                            </p>
                        )}
                        <label className="ic-shop">
                            <input
                                type="checkbox"
                                checked={checked}
                                tabIndex={isFront ? 0 : -1}
                                onChange={onToggle}
                            />
                            Add to shopping list
                        </label>
                    </>
                )}
            </div>
        </>
    )
}

export default RecipeIndex
