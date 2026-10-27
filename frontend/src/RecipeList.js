import {useState} from 'react'
import { authFetch } from './api'
import './Recipes.css'
import {useNavigate} from 'react-router-dom'
import { CATEGORIES } from './categories'
import { ArrowIcon } from './icons'

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
        <div>
            {recipes.length === 0 && (
                <p className="empty-state">No recipes to show.</p>
            )}
            {recipes.map(recipe => (
                <div key={recipe.id} className="recipe-card" onClick={() => toggleExpand(recipe.id)}>
                    <div className="recipe-card-top">
                        <div className="recipe-card-title">
                            <input
                                type="checkbox"
                                aria-label={`Add ${recipe.title} to shopping list`}
                                checked={selectedRecipes.some(r => r.id === recipe.id)}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => onToggleSelect(recipe)}
                            />
                            <div>
                                {categoryLabel(recipe.category) && (
                                    <span className="recipe-category">
                                        <span className="label-dot" aria-hidden="true" />
                                        {categoryLabel(recipe.category)}
                                    </span>
                                )}
                                <h3>{recipe.title}</h3>
                            </div>
                        </div>
                        <div className="recipe-card-meta">
                            <span className="recipe-servings">Serves {recipe.servings}</span>
                            <span className={`circle-arrow${expanded[recipe.id] ? ' open' : ''}`} aria-hidden="true">
                                <ArrowIcon />
                            </span>
                        </div>
                    </div>

                    {expanded[recipe.id] && (
                        <div className="recipe-details" onClick={(e) => e.stopPropagation()}>
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
                                    className="btn-secondary"
                                    onClick={() => navigate(`/edit/${recipe.id}`, { state: { recipe } })}
                                >
                                    Edit
                                </button>
                                <button className="btn-danger" onClick={() => handleDelete(recipe.id)}>Delete</button>
                            </div>
                            {desiredServings[recipe.id] && (
                                <p className="scale-result">
                                    Multiply each ingredient by {+(desiredServings[recipe.id] / recipe.servings).toFixed(2)}.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

export default RecipeList