import { Link } from 'react-router-dom'
import './Recipes.css'
import { CATEGORIES } from './categories'
import { CategoryIcon, Medal, MEDAL_NAMES } from './icons'

export const categoryLabel = (value) => CATEGORIES.find(c => c.value === value)?.label

// Grid of small recipe cards. Clicking a card opens its recipe page.
function RecipeList({ recipes, selectedRecipes, onToggleSelect, arrivingId }) {
    return (
        <ul className="recipe-grid">
            {recipes.map(recipe => {
                const cat = categoryLabel(recipe.category) ? recipe.category : 'other'
                return (
                    <li key={recipe.id} className={`grid-card${recipe.id === arrivingId ? ' arriving' : ''}`}>
                        <div className="grid-card-band" data-cat={cat}>
                            <input
                                type="checkbox"
                                className="grid-card-check"
                                aria-label={`Add ${recipe.title} to shopping list`}
                                checked={selectedRecipes.some(r => r.id === recipe.id)}
                                onChange={() => onToggleSelect(recipe)}
                            />
                            <span className="sticker sticker-large grid-card-sticker" aria-hidden="true">
                                <CategoryIcon cat={cat} size={34} />
                            </span>
                            {recipe.bake_count > 0 && (
                                <Medal medal={recipe.best_medal} size={30} className="grid-card-medal" />
                            )}
                        </div>
                        <div className="grid-card-body">
                            <h3>
                                {/* The link covers the whole card (see .card-link::after) */}
                                <Link to={`/recipe/${recipe.id}`} state={{ recipe }} className="card-link">
                                    {recipe.title}
                                </Link>
                            </h3>
                            <p className="grid-card-meta">
                                {categoryLabel(recipe.category) && (
                                    <span className="chip" data-cat={recipe.category}>{categoryLabel(recipe.category)}</span>
                                )}
                                <span>Serves {recipe.servings}</span>
                            </p>
                            {recipe.bake_count > 0 && (
                                <p className="grid-card-baked">
                                    <span className="visually-hidden">Best result: {MEDAL_NAMES[recipe.best_medal]}. </span>
                                    Baked {recipe.bake_count} {recipe.bake_count === 1 ? 'time' : 'times'}
                                </p>
                            )}
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}

export default RecipeList
