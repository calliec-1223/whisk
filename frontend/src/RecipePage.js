import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { authFetch } from './api'
import { CategoryIcon, Medal, MEDAL_NAMES } from './icons'
import { categoryLabel } from './RecipeList'
import './Recipes.css'

// One recipe on its own page: ingredients, steps, scaling, bake, edit, delete.
function RecipePage() {
    const { id } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const [recipe, setRecipe] = useState(location.state?.recipe || null)
    const [notFound, setNotFound] = useState(false)
    const [desiredServings, setDesiredServings] = useState('')
    const [confirming, setConfirming] = useState(false)

    // Always load the latest copy (bake count may have changed since the list loaded)
    useEffect(() => {
        authFetch(`/recipes/${id}`)
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then(setRecipe)
            .catch(() => setNotFound(true))
    }, [id])

    if (notFound) return <Navigate to="/recipes" />
    if (!recipe) {
        return (
            <div className="recipes-container">
                <p className="muted">Opening your recipe…</p>
            </div>
        )
    }

    const cat = categoryLabel(recipe.category) ? recipe.category : 'other'
    const wanted = Number(desiredServings)
    const scaling = wanted > 0 && wanted !== recipe.servings

    // The recipe book does the actual delete, so it can offer Undo
    const deleteRecipe = () => navigate('/recipes', { state: { deleted: recipe } })

    return (
        <div className="page-enter recipes-page recipe-page">
            <div className="recipes-container">
                <Link to="/recipes" className="back-link">Back to my recipe book</Link>

                <article className="recipe-sheet">
                    <div className="recipe-sheet-band" data-cat={cat}>
                        <span className="sticker sticker-large" aria-hidden="true">
                            <CategoryIcon cat={cat} size={36} />
                        </span>
                    </div>

                    <div className="recipe-sheet-body">
                        <h1>{recipe.title}</h1>
                        <p className="grid-card-meta">
                            {categoryLabel(recipe.category) && (
                                <span className="chip" data-cat={recipe.category}>
                                    <CategoryIcon cat={recipe.category} size={14} />
                                    {categoryLabel(recipe.category)}
                                </span>
                            )}
                            <span>Serves {recipe.servings}</span>
                            {recipe.bake_count > 0 && (
                                <span className="baked">
                                    <Medal medal={recipe.best_medal} size={20} />
                                    <span className="visually-hidden">Best result: {MEDAL_NAMES[recipe.best_medal]}.</span>
                                    Baked {recipe.bake_count} {recipe.bake_count === 1 ? 'time' : 'times'}
                                </span>
                            )}
                        </p>

                        {confirming ? (
                            <div className="delete-confirm" role="group" aria-label="Confirm delete">
                                <p>Delete this recipe? You can undo right after.</p>
                                <div className="delete-confirm-actions">
                                    <button type="button" className="rb-ghost" autoFocus onClick={() => setConfirming(false)}>
                                        Keep it
                                    </button>
                                    <button type="button" className="rb-danger-solid" onClick={deleteRecipe}>
                                        Yes, delete
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="recipe-actions">
                                <Link
                                    to={`/bake/${recipe.id}`}
                                    state={{ recipe, servings: scaling ? wanted : undefined }}
                                    className="rb-button"
                                >
                                    {scaling ? `Start baking for ${wanted}` : 'Start baking'}
                                </Link>
                                <input
                                    className="scale-input"
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    placeholder="Scale to servings"
                                    aria-label="Scale to servings"
                                    value={desiredServings}
                                    onChange={(e) => setDesiredServings(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="rb-ghost"
                                    onClick={() => navigate(`/edit/${recipe.id}`, { state: { recipe } })}
                                >
                                    Edit
                                </button>
                                <button type="button" className="rb-ghost rb-danger" onClick={() => setConfirming(true)}>
                                    Delete
                                </button>
                            </div>
                        )}
                        {scaling && (
                            <p className="scale-result">
                                Cooking mode will scale the amounts for {wanted} servings.
                            </p>
                        )}

                        <div className="recipe-section">
                            <h2>Ingredients</h2>
                            <ul className="ingredient-display-list">
                                {recipe.ingredients.split('\n').map((ing, i) => <li key={i}>{ing}</li>)}
                            </ul>
                        </div>
                        <div className="recipe-section">
                            <h2>Steps</h2>
                            <ol className="steps-list">
                                {recipe.steps.split('\n').map((step, i) => <li key={i}>{step}</li>)}
                            </ol>
                        </div>
                        {recipe.notes && (
                            <div className="recipe-section">
                                <h2>Notes</h2>
                                <p className="recipe-notes">{recipe.notes}</p>
                            </div>
                        )}
                    </div>
                </article>
            </div>
        </div>
    )
}

export default RecipePage
