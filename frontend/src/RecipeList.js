import {useState} from 'react'
import './Recipes.css'
import {useNavigate} from 'react-router-dom'

function RecipeList ({ recipes, onRecipeDeleted, token }){
    
    const [desiredServings, setDesiredServings] = useState({})
    const navigate = useNavigate()

    const handleServingsChange = (id, value) => {
        setDesiredServings({...desiredServings, [id]: value})
    }
    
    const handleDelete = (id) => {
        console.log('Deleting recipe:', id)
        fetch(`http://127.0.0.1:5000/recipes/${id}`, {
            method: 'DELETE',
            headers: {'Authorization': `Bearer ${token}`}
        })
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
            <p className="empty-state">No recipes yet — add your first one! 🧁</p>
        )}
        {recipes.map(recipe => (
            <div key={recipe.id} className="recipe-card" onClick={() => toggleExpand(recipe.id)} style={{cursor: 'pointer'}}>
    <div className="recipe-card-header">
        <h3>{recipe.title}</h3>
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <span className="recipe-servings">serves {recipe.servings}</span>
            <span style={{color: 'var(--text-light)', fontSize: '18px'}}>
                {expanded[recipe.id] ? '↑' : '↓'}
            </span>
        </div>
    </div>

                {expanded[recipe.id] && (
                    <div className="recipe-details">
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
                            <div className="recipe-notes">
                                <span>📝</span>
                                <p>{recipe.notes}</p>
                            </div>
                        )}
                       <div className="recipe-actions" onClick={(e) => e.stopPropagation()}>

                            <input
                                className="scale-input"
                                onClick = {(e) => e.stopPropagation()}
                                type="number"
                                placeholder="Desired servings"
                                value={desiredServings[recipe.id] || ''}
                                onChange={(e) => handleServingsChange(recipe.id, e.target.value)}
                            />
                            <button className="delete-btn" onClick={() => handleDelete(recipe.id)}>Delete</button>
                            <button onClick={(e) => {
    e.stopPropagation()
    navigate(`/edit/${recipe.id}`, { state: { recipe } })
}}>Edit</button>
                        </div>
                        {desiredServings[recipe.id] && (
                            <p className="scale-result">
                                Scale factor: {(desiredServings[recipe.id] / recipe.servings).toFixed(2)}x — multiply all ingredients by {(desiredServings[recipe.id] / recipe.servings).toFixed(2)}
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