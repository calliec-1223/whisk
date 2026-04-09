import { useLocation, Navigate } from 'react-router-dom'
import EditRecipe from './EditRecipe'

function EditRecipePage() {
    const location = useLocation()
    const recipe = location.state?.recipe

    if (!recipe) return <Navigate to="/recipes" />

    return <EditRecipe recipe={recipe} />
}

export default EditRecipePage