import { useEffect, useState } from 'react'
import AddRecipe from './AddRecipe'
import RecipeList from './RecipeList'
import Converter from './Converter'

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
      <RecipeList recipes = {recipes} onRecipeDeleted = {fetchRecipes} />
      <Converter/>
    </div>
  )
}

export default App