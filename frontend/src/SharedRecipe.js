import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { apiFetch, authFetch } from './api'
import { useCelebrate } from './Celebrate'
import { CategoryIcon, WhiskIcon } from './icons'
import { cardCategory, categoryLabel } from './RecipeIndex'
import { siteName } from './PulledRecipe'
import './Recipes.css'
import './RecipeIndex.css'
import './SharedRecipe.css'

// A recipe someone shared with a link (/r/:token). Anyone can read it, logged in or not;
// logged-in bakers can save their own copy.
function SharedRecipe() {
    const { token } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const celebrate = useCelebrate()
    const [recipe, setRecipe] = useState(null)
    const [missing, setMissing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const loggedIn = Boolean(localStorage.getItem('token'))

    useEffect(() => {
        setRecipe(null)
        setMissing(false)
        apiFetch(`/shared/${encodeURIComponent(token)}`)
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then(setRecipe)
            .catch(() => setMissing(true))
    }, [token])

    const saveCopy = () => {
        setSaving(true)
        setError('')
        authFetch(`/shared/${encodeURIComponent(token)}/save`, { method: 'POST' })
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then(data => {
                celebrate(data.new_stickers)
                navigate(`/recipes/${data.id}`)
            })
            .catch(() => {
                setError("Couldn't save it. Please try again.")
                setSaving(false)
            })
    }

    const cat = recipe ? cardCategory(recipe) : 'other'

    return (
        <div className="recipes-page shared-page">
            <header className="shared-top">
                <Link to={loggedIn ? '/recipes' : '/'} className="shared-brand">
                    <WhiskIcon size={22} />Whisk
                </Link>
            </header>

            <main className="shared-main">
                {missing && (
                    <div className="pulled-card shared-missing">
                        <h1>This link doesn't work</h1>
                        <p>The baker may have turned it off, or the link was copied wrong.</p>
                        <Link to={loggedIn ? '/recipes' : '/'} className="rb-button">
                            {loggedIn ? 'Go to my recipe box' : 'Go to Whisk'}
                        </Link>
                    </div>
                )}
                {!missing && !recipe && <p className="muted">Opening the recipe…</p>}

                {recipe && (
                    <article className="pulled-card" data-cat={cat} aria-labelledby="shared-title">
                        <header className="pulled-head">
                            <span className="ic-dot" aria-hidden="true"><CategoryIcon cat={cat} size={20} /></span>
                            <h1 id="shared-title">{recipe.title}</h1>
                        </header>
                        <div className="pulled-body">
                            <p className="shared-by">Shared by {recipe.shared_by}</p>
                            <p className="ic-meta">
                                <span className="chip" data-cat={cat}>{categoryLabel(cat)}</span>
                                <span>Serves {recipe.servings}</span>
                                {recipe.source_url && (
                                    <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                                        From {siteName(recipe.source_url)}
                                    </a>
                                )}
                            </p>

                            <div className="recipe-actions">
                                {loggedIn ? (
                                    <button type="button" onClick={saveCopy} disabled={saving}>
                                        Save to my recipe box
                                    </button>
                                ) : (
                                    <>
                                        <Link to="/" state={{ from: location.pathname }} className="rb-button">
                                            Log in to save a copy
                                        </Link>
                                        <Link to="/signup" state={{ from: location.pathname }} className="rb-button rb-ghost">
                                            Make an account
                                        </Link>
                                    </>
                                )}
                            </div>
                            {error && <p className="form-error">{error}</p>}

                            <section className="recipe-section">
                                <h2>Ingredients</h2>
                                <ul className="ingredient-display-list">
                                    {recipe.ingredients.split('\n').map((ing, i) => <li key={i}>{ing}</li>)}
                                </ul>
                            </section>
                            <section className="recipe-section">
                                <h2>Steps</h2>
                                <ol className="steps-list">
                                    {recipe.steps.split('\n').map((step, i) => <li key={i}>{step}</li>)}
                                </ol>
                            </section>
                            {recipe.notes && (
                                <section className="recipe-section">
                                    <h2>Notes</h2>
                                    <p className="recipe-notes">{recipe.notes}</p>
                                </section>
                            )}
                        </div>
                    </article>
                )}
            </main>
        </div>
    )
}

export default SharedRecipe
