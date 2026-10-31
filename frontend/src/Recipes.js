import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { authFetch } from './api'
import RecipeList from './RecipeList'
import { CATEGORIES } from './categories'
import { useChat } from './ChatContext'
import { BowlIcon, CategoryIcon, WheelIcon } from './icons'
import PageHeader from './PageHeader'
import Toast from './Toast'
import SpinnerModal from './Spinner'
import { useCelebrate } from './Celebrate'
import { play } from './sound'

const PAGE_SIZE = 10
const UNDO_MS = 6000
const TABS = [{ value: '', label: 'All' }, ...CATEGORIES]

function Recipes() {
    const [recipes, setRecipes] = useState([])
    const { setIsOpen: setChatOpen } = useChat()
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [selectedRecipes, setSelectedRecipes] = useState([])
    const [showShoppingList, setShowShoppingList] = useState(false)
    const [page, setPage] = useState(1)
    // Ticked shopping-list items, keyed "recipeId-lineIndex"
    const [boughtItems, setBoughtItems] = useState({})
    // A deleted recipe waits here for UNDO_MS before the server delete is sent,
    // so Undo only has to bring it back on screen.
    const [pendingDelete, setPendingDelete] = useState(null)
    const pendingRef = useRef(null)
    const [notice, setNotice] = useState('')
    const clearNotice = useCallback(() => setNotice(''), [])
    const [showSpinner, setShowSpinner] = useState(false)
    const celebrate = useCelebrate()

    const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === '' || r.category === categoryFilter
    return matchesSearch && matchesCategory
})

    const pageCount = Math.max(1, Math.ceil(filteredRecipes.length / PAGE_SIZE))
    // Clamp so deleting the last recipe on a page doesn't leave an empty page
    const currentPage = Math.min(page, pageCount)
    const pagedRecipes = filteredRecipes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    const goToPage = (n) => {
        setPage(n)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

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
        setRecipes(prev => prev.filter(r => r.id !== recipe.id))
        setSelectedRecipes(prev => prev.filter(r => r.id !== recipe.id))
    }

    const undoDelete = () => {
        const pending = pendingRef.current
        if (!pending) return
        clearTimeout(pending.timer)
        pendingRef.current = null
        setPendingDelete(null)
        setNotice('Recipe restored!')
        fetchRecipes()
    }

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
    const chooseCategory = (value) => {
        setCategoryFilter(value)
        setPage(1)
    }

    const emptyText = recipes.length === 0
        ? "Your recipe book is empty. Let's add your first recipe!"
        : 'No recipes match. Try a different search or tab!'

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

    return (
        <div className="page-enter recipes-page">
            <div className="recipes-container">
                <PageHeader
                    title="My recipe book"
                    meta={`${recipes.length} ${recipeWord(recipes.length)} collected`}
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
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    />
                    <button type="button" className="ask-link" onClick={() => setChatOpen(true)}>
                        Stuck on a bake? Ask the assistant!
                    </button>
                </div>

                <div className="recipe-box">
                    <div className="box-tabs" role="group" aria-label="Filter by category">
                        {TABS.map(c => (
                            <button
                                type="button"
                                key={c.value || 'all'}
                                data-cat={c.value || 'all'}
                                className={`box-tab${categoryFilter === c.value ? ' active' : ''}`}
                                aria-pressed={categoryFilter === c.value}
                                onClick={() => chooseCategory(c.value)}
                            >
                                <CategoryIcon cat={c.value} />
                                {c.label}
                            </button>
                        ))}
                    </div>

                    <div className="box-body">
                        {selectedRecipes.length > 0 && (
                            <div className="shopping-bar">
                                <span>
                                    {selectedRecipes.length} {recipeWord(selectedRecipes.length)} picked
                                </span>
                                <button type="button" className="rb-text-button" onClick={() => setSelectedRecipes([])}>
                                    Clear
                                </button>
                                <button type="button" className="rb-button" onClick={() => setShowShoppingList(true)}>
                                    Make shopping list
                                </button>
                            </div>
                        )}

                        {pagedRecipes.length === 0 ? (
                            <div className="empty-state">
                                <BowlIcon size={44} />
                                <p>{emptyText}</p>
                            </div>
                        ) : (
                            <RecipeList
                                recipes={pagedRecipes}
                                onDelete={deleteRecipe}
                                selectedRecipes={selectedRecipes}
                                onToggleSelect={toggleSelectRecipe}
                            />
                        )}

                        {pageCount > 1 && (
                            <nav className="pagination" aria-label="Recipe pages">
                                <button
                                    type="button"
                                    className="rb-ghost"
                                    disabled={currentPage === 1}
                                    onClick={() => goToPage(currentPage - 1)}
                                >
                                    Previous
                                </button>
                                <span className="pagination-status">Page {currentPage} of {pageCount}</span>
                                <button
                                    type="button"
                                    className="rb-ghost"
                                    disabled={currentPage === pageCount}
                                    onClick={() => goToPage(currentPage + 1)}
                                >
                                    Next
                                </button>
                            </nav>
                        )}
                    </div>
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
                                <div key={recipe.id} className="shopping-group">
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

export default Recipes