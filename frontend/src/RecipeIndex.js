import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CategoryIcon, Medal, MEDAL_NAMES } from './icons'
import { CATEGORIES } from './categories'
import './RecipeIndex.css'

export const categoryLabel = (value) => CATEGORIES.find(c => c.value === value)?.label
export const cardCategory = (recipe) => (categoryLabel(recipe.category) ? recipe.category : 'other')

// Recipes sorted into category sections, alphabetical within each
export function buildSections(recipes) {
    return CATEGORIES.map(c => ({
        cat: c.value,
        label: c.label,
        recipes: recipes
            .filter(r => cardCategory(r) === c.value)
            .sort((a, b) => a.title.localeCompare(b.title)),
    })).filter(s => s.recipes.length > 0)
}

// An open drawer of index cards seen from above: each card shows its top strip,
// grouped behind category dividers. Clicking a card pulls it out beside the drawer.
function RecipeIndex({ sections, openId, arrivingId, jumpTo, selected, onToggleSelect, footer, empty }) {
    const scrollRef = useRef(null)

    // Keep the open card in view (for example after opening it from a link,
    // which can happen before the recipes have loaded)
    const loaded = sections.length > 0
    useEffect(() => {
        const row = openId && scrollRef.current?.querySelector(`[data-id="${openId}"]`)
        if (row) scrollIntoDrawer(scrollRef.current, row)
    }, [openId, loaded])

    // A category tab scrolls its section to the top of the drawer
    useEffect(() => {
        const section = jumpTo && scrollRef.current?.querySelector(`[data-section="${jumpTo.cat}"]`)
        if (!section) return
        // The divider's tab sticks up above the section, so leave room to show it
        const tab = section.querySelector('.divider-tab')
        const top = section.offsetTop - (tab ? tab.offsetHeight : 0) - 8
        scrollRef.current.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }, [jumpTo])

    const renderSection = (s) => (
        <section key={s.cat} data-section={s.cat} data-cat={s.cat} aria-labelledby={`divider-${s.cat}`}>
            <h2 id={`divider-${s.cat}`} className="drawer-divider">
                <span className="divider-tab" style={{ '--tab': CATEGORIES.findIndex(c => c.value === s.cat) }}>
                    <CategoryIcon cat={s.cat} size={15} />
                    {s.label}
                </span>
                <span className="divider-count">
                    {s.recipes.length} {s.recipes.length === 1 ? 'recipe' : 'recipes'}
                </span>
            </h2>
            <ul className="drawer-cards">
                {s.recipes.map(recipe => {
                    const isOpen = String(recipe.id) === openId
                    const classes = ['card-top', isOpen ? 'pulled' : '', String(recipe.id) === arrivingId ? 'arriving' : '']
                    return (
                        <li key={recipe.id} data-id={recipe.id} className={classes.filter(Boolean).join(' ')}>
                            <input
                                type="checkbox"
                                className="card-top-check"
                                aria-label={`Add ${recipe.title} to shopping list`}
                                title="Add to shopping list"
                                checked={selected.some(r => r.id === recipe.id)}
                                onChange={() => onToggleSelect(recipe)}
                            />
                            <span className="ic-dot" aria-hidden="true">
                                <CategoryIcon cat={s.cat} size={15} />
                            </span>
                            <Link
                                to={isOpen ? '/recipes' : `/recipes/${recipe.id}`}
                                className="card-link"
                                aria-current={isOpen ? 'true' : undefined}
                            >
                                {recipe.title}
                                {isOpen && <span className="visually-hidden"> (open, select to put it back)</span>}
                            </Link>
                            <span className="card-top-meta">Serves {recipe.servings}</span>
                            {recipe.bake_count > 0 && (
                                <span className="card-top-medal">
                                    <Medal medal={recipe.best_medal} size={22} />
                                    <span className="visually-hidden">
                                        Best result: {MEDAL_NAMES[recipe.best_medal]}. Baked {recipe.bake_count} {recipe.bake_count === 1 ? 'time' : 'times'}.
                                    </span>
                                </span>
                            )}
                        </li>
                    )
                })}
            </ul>
        </section>
    )

    return (
        <div className="drawer">
            <div ref={scrollRef} className="drawer-scroll">
                {sections.length === 0 && empty}
                {splitInTwo(sections).map((column, i) => (
                    <div key={i} className="drawer-column">{column.map(renderSection)}</div>
                ))}
            </div>
            {footer}
        </div>
    )
}

// Split the sections into two columns of about the same height, keeping their order,
// so stacking the columns (when the drawer is narrow) reads the same as one list
function splitInTwo(sections) {
    const size = (s) => s.recipes.length + 2 // a divider takes about two rows
    const total = sections.reduce((sum, s) => sum + size(s), 0)
    let best = 0
    let bestGap = Infinity
    let running = 0
    for (let i = 0; i <= sections.length; i++) {
        const gap = Math.abs(total / 2 - running)
        if (gap < bestGap) {
            best = i
            bestGap = gap
        }
        if (i < sections.length) running += size(sections[i])
    }
    return [sections.slice(0, best), sections.slice(best)]
}

// Scroll the drawer (not the page) just enough to show a row
function scrollIntoDrawer(scroller, row) {
    const top = row.offsetTop
    const bottom = top + row.offsetHeight
    if (top < scroller.scrollTop + 8) scroller.scrollTop = top - 8
    else if (bottom > scroller.scrollTop + scroller.clientHeight - 8) {
        scroller.scrollTop = bottom - scroller.clientHeight + 8
    }
}

export default RecipeIndex
