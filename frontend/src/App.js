import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Signup from './Signup'
import Recipes from './Recipes'
import AddRecipe from './AddRecipe'
import Converter from './Converter'
import Layout from './Layout'

function App() {
  const token = localStorage.getItem('token')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/recipes" element={token ? <Layout><Recipes /></Layout> : <Navigate to="/" />} />
        <Route path="/add" element={token ? <Layout><AddRecipe /></Layout> : <Navigate to="/" />} />
        <Route path="/convert" element={token ? <Layout><Converter /></Layout> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App