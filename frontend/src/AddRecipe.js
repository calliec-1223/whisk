import { authFetch } from './api'
import RecipeForm from './RecipeForm'

function AddRecipe() {
    return (
        <RecipeForm
            heading="New recipe"
            saveLabel="Save recipe"
            toastMessage="Recipe saved"
            save={(body) => authFetch('/recipes', { method: 'POST', body })}
        />
    )
}

export default AddRecipe
