import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Signup from './Signup'
import Recipes from './Recipes'
import AddRecipe from './AddRecipe'
import Converter from './Converter'
import Layout from './Layout'
import EditRecipePage from './EditRecipePage'
import Bake from './Bake'
import RecipePage from './RecipePage'
import StickerBook from './StickerBook'
import { CelebrateProvider } from './Celebrate'
import { TimerProvider } from './Timers'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/" />
}

function App() {
  return (
    <BrowserRouter>
      <TimerProvider>
      <CelebrateProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/recipes" element={<ProtectedRoute><Layout><Recipes /></Layout></ProtectedRoute>} />
        <Route path="/add" element={<ProtectedRoute><Layout><AddRecipe /></Layout></ProtectedRoute>} />
        <Route path="/convert" element={<ProtectedRoute><Layout><Converter /></Layout></ProtectedRoute>} />
        <Route path="/edit/:id" element={<ProtectedRoute><Layout><EditRecipePage /></Layout></ProtectedRoute>} />
        <Route path="/recipe/:id" element={<ProtectedRoute><Layout><RecipePage /></Layout></ProtectedRoute>} />
        <Route path="/bake/:id" element={<ProtectedRoute><Layout><Bake /></Layout></ProtectedRoute>} />
        <Route path="/stickers" element={<ProtectedRoute><Layout><StickerBook /></Layout></ProtectedRoute>} />
      </Routes>
      </CelebrateProvider>
      </TimerProvider>
    </BrowserRouter>
  )
}

export default App