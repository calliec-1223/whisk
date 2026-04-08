import {useState} from 'react'

function RecipeList ({ recipes, onRecipeDeleted }){
    
    const [desiredServings, setDesiredServings] = useState({})

    const handleServingsChange = (id, value) => {
        setDesiredServings({...desiredServings, [id]: value})
    }
    
    const handleDelete = (id) => {
        console.log('Deleting recipe:', id)
        fetch(`http://127.0.0.1:5000/recipes/${id}`, {
            method: 'DELETE'
        })
        .then(res => res.json())
        .then (() => {
            onRecipeDeleted()
        })
    }
    return (
        <div>
            <h2>My Recipes</h2>
            {recipes.length === 0 && <p>No Recipes Yet. Add one!</p>}
            {recipes.map(recipe => (
                <div key = {recipe.id}>
                    <h3>{recipe.title}</h3>
                    <p><strong>Ingredients: </strong>{recipe.ingredients}</p>
                    <p><strong>Steps: </strong>{recipe.steps}</p>
                    {recipe.notes && <p><strong>Notes: </strong>{recipe.notes}</p>}
                    <p><strong>Servings: </strong>{recipe.servings}</p>
                    <input
                        type = "number"
                        placeholder = "Desired Servings"
                        value = {desiredServings[recipe.id] || ''}
                        onChange = {(e) => handleServingsChange(recipe.id, e.target.value)}
                    />
                    {desiredServings[recipe.id] && (
                        <p>Scale Factor: {(desiredServings[recipe.id] / recipe.servings). 
                            toFixed(2)}x - multiply all ingredients by  {(desiredServings[recipe.id]/
                            recipe.servings).toFixed(2)}</p>
                    )}
                    <button onClick={() => handleDelete(recipe.id)}>Delete Recipe</button>
                    <hr/>
                </div>
            ))}
        </div>
    )
}



export default RecipeList