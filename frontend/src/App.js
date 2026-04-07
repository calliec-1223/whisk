import { useEffect, useState } from 'react'
import AddRecipe from './AddRecipe'

function App() {
  const [recipes, setRecipes] = useState([])

  const fetchRecipes = () => {
    fetch('http://127.0.0.1:5000/recipes')
      .then(res => res.json())
      .then (data => setRecipes(data))
  }

  useEffect(() => {
    fetchRecipes()
  }, [])

  return (
    <div>
      <h1>Whisk 🧁</h1>
      <AddRecipe onRecipeAdded = {fetchRecipes} />
      {recipes.map(recipe => (
        <div key= {recipe.id}>
          <h3>{recipe.title}</h3>
          <p>{recipe.ingredients}</p>
          <p>{recipe.steps}</p>
          <p>{recipe.notes}</p>
          <hr/>
          </div>
      ))}
    </div>
  )
}

export default App