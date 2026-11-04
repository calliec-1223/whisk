import { authFetch } from './api'
import RecipeForm from './RecipeForm'

function AddRecipe() {
    return (
        <RecipeForm
            heading="Write a new recipe"
            saveLabel="Save recipe"
            toastMessage="Recipe saved! Nice work."
            allowImport
            save={(body) => authFetch('/recipes', { method: 'POST', body })}
        />
    )
}

export default AddRecipe
