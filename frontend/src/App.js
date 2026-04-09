import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Signup from './Signup'
import Recipes from './Recipes'
import AddRecipe from './AddRecipe'
import Converter from './Converter'
import Chatbot from './Chatbot'

function App() {
  const token = localStorage.getItem('token')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/recipes" element={token ? <Recipes /> : <Navigate to="/" />} />
        <Route path="/add" element={token ? <AddRecipe /> : <Navigate to="/" />} />
        <Route path="/convert" element={token ? <Converter /> : <Navigate to="/" />} />
        <Route path="/chat" element={token ? <Chatbot /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App