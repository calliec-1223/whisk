import {useState} from 'react'
import './Recipes.css'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORIES } from './categories'
import { CategoryIcon, ChevronIcon, Medal, MEDAL_NAMES } from './icons'

const categoryLabel = (value) => CATEGORIES.find(c => c.value === value)?.label

function RecipeList ({ recipes, onDelete, selectedRecipes, onToggleSelect}){
    
    const [desiredServings, setDesiredServings] = useState({})
    const navigate = useNavigate()

    const handleServingsChange = (id, value) => {
        setDesiredServings({...desiredServings, [id]: value})
    }
    
    // Which recipe is showing its "are you sure?" step
    const [confirmingId, setConfirmingId] = useState(null)

    const [expanded, setExpanded] = useState({})

    const toggleExpand = (id) => {
        setExpanded({...expanded, [id]: !expanded[id]})
    }

    return (
        <div className="card-stack">
            {recipes.map(recipe => (
                <article key={recipe.id} className={`index-card${expanded[recipe.id] ? ' open' : ''}`}>
                    <div className="card-head">
                        <input
                            type="checkbox"
                            aria-label={`Add ${recipe.title} to shopping list`}
                            checked={selectedRecipes.some(r => r.id === recipe.id)}
                            onChange={() => onToggleSelect(recipe)}
                        />
                        <h3>
                            <button
                                type="button"
                                className="card-toggle"
                                aria-expanded={!!expanded[recipe.id]}
                                aria-controls={`recipe-${recipe.id}`}
                                onClick={() => toggleExpand(recipe.id)}
                            >
                                <span>{recipe.title}</span>
                                <ChevronIcon className="card-chevron" />
                            </button>
                        </h3>
                    </div>
                    <p className="card-meta">
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

                    {expanded[recipe.id] && (
                        <div className="recipe-details" id={`recipe-${recipe.id}`}>
                            <div className="recipe-section">
                                <h4>Ingredients</h4>
                                <ul className="ingredient-display-list">
                                    {recipe.ingredients.split('\n').map((ing, i) => (
                                        <li key={i}>{ing}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="recipe-section">
                                <h4>Steps</h4>
                                <ol className="steps-list">
                                    {recipe.steps.split('\n').map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ol>
                            </div>
                            {recipe.notes && (
                                <p className="recipe-notes">{recipe.notes}</p>
                            )}
                            {confirmingId === recipe.id ? (
                                <div className="delete-confirm" role="group" aria-label="Confirm delete">
                                    <p>Delete this recipe? You can undo right after.</p>
                                    <div className="delete-confirm-actions">
                                        <button
                                            type="button"
                                            className="rb-ghost"
                                            autoFocus
                                            onClick={() => setConfirmingId(null)}
                                        >
                                            Keep it
                                        </button>
                                        <button
                                            type="button"
                                            className="rb-danger-solid"
                                            onClick={() => { setConfirmingId(null); onDelete(recipe) }}
                                        >
                                            Yes, delete
                                        </button>
                                    </div>
                                </div>
                            ) : (
                            <div className="recipe-actions">
                                <Link to={`/bake/${recipe.id}`} state={{ recipe }} className="rb-button">
                                    Start baking
                                </Link>
                                <input
                                    className="scale-input"
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    placeholder="Scale to servings"
                                    aria-label="Scale to servings"
                                    value={desiredServings[recipe.id] || ''}
                                    onChange={(e) => handleServingsChange(recipe.id, e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="rb-ghost"
                                    onClick={() => navigate(`/edit/${recipe.id}`, { state: { recipe } })}
                                >
                                    Edit
                                </button>
                                <button type="button" className="rb-ghost rb-danger" onClick={() => setConfirmingId(recipe.id)}>Delete</button>
                            </div>
                            )}
                            {desiredServings[recipe.id] && (
                                <p className="scale-result">
                                    Multiply each ingredient by {+(desiredServings[recipe.id] / recipe.servings).toFixed(2)} to serve {desiredServings[recipe.id]}!
                                </p>
                            )}
                        </div>
                    )}
                </article>
            ))}
        </div>
    )
}

export default RecipeList