import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authFetch } from './api'
import RecipeList from './RecipeList'
import { CATEGORIES } from './categories'
import { useChat } from './ChatContext'

const PAGE_SIZE = 10
const TABS = [{ value: '', label: 'All' }, ...CATEGORIES]

function Recipes() {
    const [recipes, setRecipes] = useState([])
    const { setIsOpen: setChatOpen } = useChat()
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [selectedRecipes, setSelectedRecipes] = useState([])
    const [showShoppingList, setShowShoppingList] = useState(false)
    const [page, setPage] = useState(1)

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
    if (Array.isArray(data)) {
        setRecipes(data)
    } else {
        setRecipes([])
    }
})
    }

    useEffect(() => {
        fetchRecipes()
    }, [])
    const chooseCategory = (value) => {
        setCategoryFilter(value)
        setPage(1)
    }

    const emptyText = recipes.length === 0
        ? 'No recipes yet. Add your first one with New recipe.'
        : 'No recipes match. Try another search or category.'

    return (
        <div className="page-enter recipes-page">
            <div className="recipes-container">
                <header className="box-header">
                    <div>
                        <h1>Recipes</h1>
                        <p className="box-count">{recipes.length} saved</p>
                    </div>
                    <Link to="/add" className="rb-button">New recipe</Link>
                </header>

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
                        Have a baking question? Ask the assistant
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
                                {c.label}
                            </button>
                        ))}
                    </div>

                    <div className="box-body">
                        {selectedRecipes.length > 0 && (
                            <div className="shopping-bar">
                                <span>
                                    {selectedRecipes.length} {selectedRecipes.length === 1 ? 'recipe' : 'recipes'} selected
                                </span>
                                <button type="button" className="rb-text-button" onClick={() => setSelectedRecipes([])}>
                                    Clear
                                </button>
                                <button type="button" className="rb-button" onClick={() => setShowShoppingList(true)}>
                                    Shopping list
                                </button>
                            </div>
                        )}

                        {pagedRecipes.length === 0 ? (
                            <p className="empty-state">{emptyText}</p>
                        ) : (
                            <RecipeList
                                recipes={pagedRecipes}
                                onRecipeDeleted={fetchRecipes}
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

                {showShoppingList && (
                    <div className="modal-backdrop" onClick={() => setShowShoppingList(false)}>
                        <div
                            className="modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="shopping-list-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 id="shopping-list-title">Shopping list</h2>
                            {selectedRecipes.map(recipe => (
                                <div key={recipe.id} className="shopping-group">
                                    <h3>{recipe.title}</h3>
                                    {recipe.ingredients.split('\n').map((ing, i) => (
                                        <label key={i} className="shopping-item">
                                            <input type="checkbox" />
                                            <span>{ing}</span>
                                        </label>
                                    ))}
                                </div>
                            ))}
                            <button type="button" className="rb-ghost rb-block" onClick={() => setShowShoppingList(false)}>
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