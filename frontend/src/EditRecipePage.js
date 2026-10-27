import { useEffect, useState } from 'react'
import { useLocation, useParams, Navigate } from 'react-router-dom'
import { authFetch } from './api'
import RecipeForm from './RecipeForm'

function EditRecipePage() {
    const location = useLocation()
    const { id } = useParams()
    // Coming from the list passes the recipe along; a refresh or shared link has to load it
    const [recipe, setRecipe] = useState(location.state?.recipe || null)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        if (recipe) return
        authFetch(`/recipes/${id}`)
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then(setRecipe)
            .catch(() => setNotFound(true))
    }, [id, recipe])

    if (notFound) return <Navigate to="/recipes" />
    if (!recipe) {
        return (
            <div className="add-container">
                <p className="muted">Loading recipe…</p>
            </div>
        )
    }
    return (
        <RecipeForm
            heading="Edit recipe"
            saveLabel="Save changes"
            toastMessage="Recipe updated"
            initialRecipe={recipe}
            save={(body) => authFetch(`/recipes/${recipe.id}`, { method: 'PUT', body })}
        />
    )
}

export default EditRecipePage
