import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CategoryIcon, Medal, MEDAL_NAMES } from './icons'
import { cardCategory, categoryLabel } from './RecipeIndex'

// The recipe card pulled out of the index box, open beside it.
function PulledRecipe({ recipe, onClose, onDelete }) {
    const navigate = useNavigate()
    const [desiredServings, setDesiredServings] = useState('')
    const [confirming, setConfirming] = useState(false)

    const cat = cardCategory(recipe)
    const wanted = Number(desiredServings)
    const scaling = wanted > 0 && wanted !== recipe.servings

    return (
        <article className="pulled-card" data-cat={cat} aria-labelledby="pulled-title">
            <header className="pulled-head">
                <span className="ic-dot" aria-hidden="true"><CategoryIcon cat={cat} size={20} /></span>
                <h2 id="pulled-title">{recipe.title}</h2>
                <button type="button" className="rb-ghost put-back" onClick={onClose}>Put it back</button>
            </header>

            <div className="pulled-body">
                <p className="ic-meta">
                    <span className="chip" data-cat={cat}>{categoryLabel(cat)}</span>
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
                            <button type="button" className="rb-danger-solid" onClick={() => onDelete(recipe)}>
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
                    <p className="scale-result">Cooking mode will scale the amounts for {wanted} servings.</p>
                )}

                <section className="recipe-section">
                    <h3>Ingredients</h3>
                    <ul className="ingredient-display-list">
                        {recipe.ingredients.split('\n').map((ing, i) => <li key={i}>{ing}</li>)}
                    </ul>
                </section>
                <section className="recipe-section">
                    <h3>Steps</h3>
                    <ol className="steps-list">
                        {recipe.steps.split('\n').map((step, i) => <li key={i}>{step}</li>)}
                    </ol>
                </section>
                {recipe.notes && (
                    <section className="recipe-section">
                        <h3>Notes</h3>
                        <p className="recipe-notes">{recipe.notes}</p>
                    </section>
                )}
            </div>
        </article>
    )
}

export default PulledRecipe
