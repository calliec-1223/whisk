function RecipeList ({ recipes }){
    return (
        <div>
            <h2>My Recipes</h2>
            {recipes.length === 0 && <p>No Recipes Yet. Add one!</p>}
            {recipes.map(recipe => (
                <div key = {recipe.id}>
                    <h3>{recipe.title}</h3>
                    <p><strong>Ingredients:</strong>{recipe.ingredients}</p>
                    <p><strong>Steps:</strong>{recipe.steps}</p>
                    {recipe.notes && <p><strong>Notes:</strong>{recipe.notes}</p>}
                    <hr/>
                </div>
            ))}
        </div>
    )
}

export default RecipeList