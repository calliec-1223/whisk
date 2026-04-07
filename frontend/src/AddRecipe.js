import { useState } from 'react'

function AddRecipe({ onRecipeAdded }) {
    const [form, setForm] = useState({
        title: '',
        ingredients: '',
        steps: '',
        notes: ''
    })

    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value })
    }

    const [error, setError] = useState('')

    const handleSubmit = () => {
        if (form.title === '' || form.ingredients === '' || form.steps === ''){
            setError('Please fill all required fields.')
            return
        }
        setError('')
        fetch('http://127.0.0.1:5000/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(form)
        })
        .then(res => res.json())
        .then (() => {
            onRecipeAdded()
            setForm ({title: '', ingredients: '', steps: '', notes: ''})
        })
    }

    return (
        <div>
            <h2>Add a Recipe</h2>
            <input
                name = "title"
                placeholder = "Recipe Title"
                value = {form.title}
                onChange = {handleChange}
            />
            <textarea
                name = "ingredients"
                placeholder = "Ingredients (one per line)"
                value = {form.ingredients}
                onChange = {handleChange}
            />
            <textarea
                name = "steps"
                placeholder = "Steps"
                value = {form.steps}
                onChange = {handleChange}
            />
            <input
                name = "notes"
                placeholder = "Notes (optional)"
                value = {form.notes}
                onChange = {handleChange}
            />
            {error && <p style = {{color: 'red'}}>{error}</p>}
            <button onClick = {handleSubmit} > Save Recipe</button>
        </div>
    )
}

export default AddRecipe



