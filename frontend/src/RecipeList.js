import {useState} from 'react'
import { authFetch } from './api'
import './Recipes.css'
import {useNavigate} from 'react-router-dom'
import { CATEGORIES } from './categories'
import { ChevronIcon } from './icons'

const categoryLabel = (value) => CATEGORIES.find(c => c.value === value)?.label

function RecipeList ({ recipes, onRecipeDeleted, selectedRecipes, onToggleSelect}){
    
    const [desiredServings, setDesiredServings] = useState({})
    const navigate = useNavigate()

    const handleServingsChange = (id, value) => {
        setDesiredServings({...desiredServings, [id]: value})
    }
    
    const handleDelete = (id) => {
        authFetch(`/recipes/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then (() => {
            onRecipeDeleted()
        })
    }

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
                            <span className="chip" data-cat={recipe.category}>{categoryLabel(recipe.category)}</span>
                        )}
                        <span>Serves {recipe.servings}</span>
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
                            <div className="recipe-actions">
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
                                <button type="button" className="rb-ghost rb-danger" onClick={() => handleDelete(recipe.id)}>Delete</button>
                            </div>
                            {desiredServings[recipe.id] && (
                                <p className="scale-result">
                                    Multiply each ingredient by {+(desiredServings[recipe.id] / recipe.servings).toFixed(2)}.
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