import { useEffect, useState } from 'react'
import AddRecipe from './AddRecipe'
import RecipeList from './RecipeList'
import Converter from './Converter'
import Chatbot from './Chatbot'
import Login from './Login'
import Signup from './Signup'

function App() {
  const [recipes, setRecipes] = useState([])
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [page, setPage ] = useState('login')

  const fetchRecipes = () => {
    console.log('fetching with token:', token)
    fetch('http://127.0.0.1:5000/recipes', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then (data => setRecipes(data))
  }
  

  useEffect(() => {
    if (token) fetchRecipes()
  }, [token])

  const handleLogin = () => {
    setToken (localStorage.getItem('token'))
    setPage('app')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setPage('login')
  }

  if (!token || page === 'login')
    return (
      <div>
        <h1>Whisk</h1>
        {page === 'login'
          ? <Login onLogin = {handleLogin} />
        : <Signup onSignup={() => setPage('login')} />
        }

        {page === 'login'
        ? <button onClick = {() => setPage('signup')}>Create Account</button>
        : <button onClick = {() => setPage('login')}>Back to Login</button>
        }
      </div>
  )

  return (
    <div>
      <h1>Whisk 🧁</h1>
      <button onClick = {handleLogout}>Logout</button>
      <AddRecipe onRecipeAdded = {fetchRecipes} token = {token}/>
      <RecipeList recipes = {recipes} onRecipeDeleted = {fetchRecipes} token = {token}/>
      <Converter/>
      <Chatbot recipes = {recipes} />
    </div>
  )
}

export default App