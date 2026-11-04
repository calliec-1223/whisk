import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { authFetch } from './api'
import './Recipes.css'
import RecipeIndex, { buildSections } from './RecipeIndex'
import PulledRecipe from './PulledRecipe'
import { useChat } from './ChatContext'
import { BowlIcon, CategoryIcon, WheelIcon } from './icons'
import PageHeader from './PageHeader'
import Toast from './Toast'
import SpinnerModal from './Spinner'
import { useCelebrate } from './Celebrate'
import { play } from './sound'

const UNDO_MS = 6000

// The recipe box: a drawer of index cards on the left, and the card you pulled out beside it.
// /recipes/:id opens that recipe's card.
function Recipes() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [recipes, setRecipes] = useState([])
    const [loaded, setLoaded] = useState(false)
    const { setIsOpen: setChatOpen } = useChat()
    const [search, setSearch] = useState('')
    const [selectedRecipes, setSelectedRecipes] = useState([])
    const [showShoppingList, setShowShoppingList] = useState(false)
    // Ticked shopping-list items, keyed "recipeId-lineIndex"
    const [boughtItems, setBoughtItems] = useState({})
    // A deleted recipe waits here for UNDO_MS before the server delete is sent,
    // so Undo only has to bring it back on screen.
    const [pendingDelete, setPendingDelete] = useState(null)
    const pendingRef = useRef(null)
    const [notice, setNotice] = useState('')
    const clearNotice = useCallback(() => setNotice(''), [])
    const [showSpinner, setShowSpinner] = useState(false)
    // A recipe brought back with Undo pops into the box
    const [arrivingId, setArrivingId] = useState(null)
    const celebrate = useCelebrate()
    // Last category tab clicked; a new object each time so clicking the same tab scrolls again
    const [jumpTo, setJumpTo] = useState(null)

    const filteredRecipes = recipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase()))
    const sections = buildSections(filteredRecipes)

    const openRecipe = id ? recipes.find(r => String(r.id) === id) : null

    // An unknown recipe id goes back to the plain box
    useEffect(() => {
        if (loaded && id && !openRecipe && pendingRef.current?.recipe.id !== Number(id)) {
            navigate('/recipes', { replace: true })
        }
    }, [loaded, id, openRecipe, navigate])

    // The desk fills the rest of the screen, so the page itself doesn't scroll
    const deskRef = useRef(null)
    useLayoutEffect(() => {
        const desk = deskRef.current
        const measure = () => {
            const top = desk.getBoundingClientRect().top + window.scrollY
            desk.style.setProperty('--desk-top', `${top}px`)
        }
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [])

    // Pulling a card out or putting it back runs as a View Transition: the browser
    // snapshots the page before and after and slides between them, which stays smooth
    // because nothing has to re-lay out while it animates. The transition waits until
    // React has drawn the new layout (the layout effect below), since the router
    // renders route changes in the background.
    const viewDone = useRef(null)
    const goTo = (to) => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!document.startViewTransition || reduceMotion) {
            navigate(to)
            return
        }
        document.startViewTransition(() => new Promise(resolve => {
            viewDone.current = resolve
            setTimeout(resolve, 500) // never hold the page frozen if the render is slow
            navigate(to)
        }))
    }
    useLayoutEffect(() => {
        viewDone.current?.()
        viewDone.current = null
    }, [id])

    const toggleSelectRecipe = (recipe) => {
        if (selectedRecipes.find(r => r.id === recipe.id)) {
            setSelectedRecipes(selectedRecipes.filter(r => r.id !== recipe.id))
        } else {
            setSelectedRecipes([...selectedRecipes, recipe])
        }
    }

    const fetchRecipes = () => {
        authFetch('/recipes')
        .then(res => res.json())
        .then(data => {
            const hiddenId = pendingRef.current?.recipe.id
            setRecipes(Array.isArray(data) ? data.filter(r => r.id !== hiddenId) : [])
            setLoaded(true)
        })
    }

    // Send the waiting delete to the server now.
    // keepalive lets the request finish even if the tab is closing.
    const commitDelete = () => {
        const pending = pendingRef.current
        if (!pending) return
        clearTimeout(pending.timer)
        pendingRef.current = null
        setPendingDelete(null)
        authFetch(`/recipes/${pending.recipe.id}`, { method: 'DELETE', keepalive: true })
            .then(res => {
                if (!res.ok && res.status !== 404) {
                    setNotice("Couldn't delete that recipe. Please try again.")
                    fetchRecipes()
                }
            })
            .catch(() => {
                setNotice("Couldn't reach the server, so the recipe wasn't deleted.")
                fetchRecipes()
            })
    }

    const deleteRecipe = (recipe) => {
        commitDelete() // only one undo at a time: finish any earlier delete first
        const timer = setTimeout(commitDelete, UNDO_MS)
        pendingRef.current = { recipe, timer }
        setPendingDelete({ recipe })
        setSelectedRecipes(prev => prev.filter(r => r.id !== recipe.id))
        setRecipes(prev => prev.filter(r => r.id !== recipe.id))
    }

    const undoDelete = () => {
        const pending = pendingRef.current
        if (!pending) return
        clearTimeout(pending.timer)
        pendingRef.current = null
        setPendingDelete(null)
        setNotice('Recipe restored!')
        setArrivingId(String(pending.recipe.id))
        setTimeout(() => setArrivingId(null), 600)
        fetchRecipes()
    }

    // Who's logged in, for the box's name and the baker rank
    const [me, setMe] = useState(null)
    useEffect(() => {
        authFetch('/me')
            .then(res => (res.ok ? res.json() : null))
            .then(setMe)
            .catch(() => {})
    }, [])

    useEffect(() => {
        fetchRecipes()
        // Leaving the page or closing the tab sends any waiting delete right away
        window.addEventListener('pagehide', commitDelete)
        return () => {
            window.removeEventListener('pagehide', commitDelete)
            commitDelete()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const shoppingKeys = selectedRecipes.flatMap(r =>
        r.ingredients.split('\n').map((_, i) => `${r.id}-${i}`))
    const allBought = shoppingKeys.length > 0 && shoppingKeys.every(k => boughtItems[k])

    const toggleBought = (key) => {
        if (!boughtItems[key]) play('pop')
        setBoughtItems({ ...boughtItems, [key]: !boughtItems[key] })
    }

    // Finishing a whole shopping list earns a sticker (the server ignores repeats)
    useEffect(() => {
        if (!allBought) return
        authFetch('/stickers/claim', { method: 'POST', body: JSON.stringify({ key: 'shopping-list' }) })
            .then(res => res.json())
            .then(data => celebrate(data.new_stickers))
            .catch(() => {})
    }, [allBought, celebrate])

    const closeShoppingList = () => {
        setShowShoppingList(false)
        setBoughtItems({})
    }

    const recipeWord = (n) => (n === 1 ? 'recipe' : 'recipes')

    const emptyText = recipes.length === 0
        ? <>Your recipe box is empty. <Link to="/add">Write your first recipe!</Link></>
        : 'No recipes match. Try a different search!'

    const shoppingFooter = selectedRecipes.length > 0 && (
        <div className="index-shop">
            <button type="button" className="rb-button" onClick={() => setShowShoppingList(true)}>
                Shopping list ({selectedRecipes.length})
            </button>
            <button type="button" className="rb-text-button" onClick={() => setSelectedRecipes([])}>
                Clear
            </button>
        </div>
    )

    return (
        <div className="page-enter recipes-page">
            <div className="recipes-container">
                <PageHeader
                    title={me ? `${me.username}'s recipe box` : 'My recipe box'}
                    meta={<>
                        {recipes.length} {recipeWord(recipes.length)} collected
                        {me && <BakerRank me={me} />}
                    </>}
                    action={
                        <div className="header-actions">
                            {recipes.length > 0 && (
                                <button type="button" className="rb-ghost" onClick={() => setShowSpinner(true)}>
                                    <WheelIcon size={18} /> What should I bake?
                                </button>
                            )}
                            <Link to="/add" className="rb-button">New recipe</Link>
                        </div>
                    }
                />

                <div className="box-tools">
                    <input
                        type="search"
                        className="box-search"
                        placeholder="Search recipes"
                        aria-label="Search recipes"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="button" className="ask-link" onClick={() => setChatOpen(true)}>
                        Stuck on a bake? Ask the assistant!
                    </button>
                </div>

                <div ref={deskRef} className={`desk${openRecipe ? ' open' : ''}`}>
                    <div className="desk-box">
                        {sections.length > 1 && (
                            <div className="box-tabs" role="group" aria-label="Jump to a category">
                                {sections.map(c => (
                                    <button
                                        type="button"
                                        key={c.cat}
                                        data-cat={c.cat}
                                        className={`box-tab${jumpTo?.cat === c.cat ? ' active' : ''}`}
                                        onClick={() => setJumpTo({ cat: c.cat })}
                                    >
                                        <CategoryIcon cat={c.cat} size={18} />
                                        <span className="box-tab-label">{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <RecipeIndex
                            sections={sections}
                            openId={id}
                            arrivingId={arrivingId}
                            jumpTo={jumpTo}
                            selected={selectedRecipes}
                            onToggleSelect={toggleSelectRecipe}
                            onOpen={goTo}
                            footer={shoppingFooter}
                            empty={<div className="empty-state"><BowlIcon size={40} /><p>{emptyText}</p></div>}
                        />
                    </div>

                    {openRecipe && (
                        <PulledRecipe
                            key={openRecipe.id}
                            recipe={openRecipe}
                            onClose={() => goTo('/recipes')}
                            onDelete={(r) => { deleteRecipe(r); goTo('/recipes') }}
                            onShareChange={(recipeId, token) => setRecipes(prev =>
                                prev.map(r => (r.id === recipeId ? { ...r, share_token: token } : r)))}
                        />
                    )}
                </div>

                {showSpinner && <SpinnerModal recipes={recipes} onClose={() => setShowSpinner(false)} />}

                {pendingDelete && (
                    <div className="toast undo-toast" role="status">
                        <span>“{pendingDelete.recipe.title}” deleted.</span>
                        <button type="button" className="undo-btn" onClick={undoDelete}>Undo</button>
                    </div>
                )}
                {notice && !pendingDelete && <Toast message={notice} onClose={clearNotice} />}

                {showShoppingList && (
                    <div className="modal-backdrop" onClick={closeShoppingList}>
                        <div
                            className="modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="shopping-list-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 id="shopping-list-title">Shopping list</h2>
                            <div className="stamp-slot" role="status">
                                {allBought && <span className="stamp">All set!</span>}
                            </div>
                            {selectedRecipes.map(recipe => (
                                <div key={recipe.id} className="shopping-group tick-list">
                                    <h3>{recipe.title}</h3>
                                    {recipe.ingredients.split('\n').map((ing, i) => (
                                        <label key={i} className="shopping-item">
                                            <input
                                                type="checkbox"
                                                checked={!!boughtItems[`${recipe.id}-${i}`]}
                                                onChange={() => toggleBought(`${recipe.id}-${i}`)}
                                            />
                                            <span>{ing}</span>
                                        </label>
                                    ))}
                                </div>
                            ))}
                            <button type="button" className="rb-ghost rb-block" onClick={closeShoppingList}>
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// The baker's title, with a bar filling up toward the next one
function BakerRank({ me }) {
    const toGo = me.next_rank_at - me.bakes
    const filled = me.next_rank ? (me.bakes - me.rank_floor) / (me.next_rank_at - me.rank_floor) : 1
    return (
        <span className="baker-rank">
            <span className="rank-name">{me.rank}</span>
            {me.next_rank && (
                <>
                    <span className="rank-bar" aria-hidden="true">
                        <span style={{ width: `${Math.round(filled * 100)}%` }} />
                    </span>
                    <span className="rank-next">
                        {toGo} more {toGo === 1 ? 'bake' : 'bakes'} to {me.next_rank}
                    </span>
                </>
            )}
        </span>
    )
}

export default Recipes