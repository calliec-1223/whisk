import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Signup from './Signup'
import Recipes from './Recipes'
import AddRecipe from './AddRecipe'
import Converter from './Converter'
import Layout from './Layout'
import EditRecipePage from './EditRecipePage'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/recipes" element={<ProtectedRoute><Layout><Recipes /></Layout></ProtectedRoute>} />
        <Route path="/add" element={<ProtectedRoute><Layout><AddRecipe /></Layout></ProtectedRoute>} />
        <Route path="/convert" element={<ProtectedRoute><Layout><Converter /></Layout></ProtectedRoute>} />
        <Route path="/edit/:id" element={<ProtectedRoute><Layout><EditRecipePage /></Layout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App