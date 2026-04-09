import { useState } from 'react'
import Navbar from './Navbar'
import {useNavigate} from 'react-router-dom'

function AddRecipe() {
    const [form, setForm] = useState({
        title: '',
        ingredients: [],
        steps: '',
        notes: '',
        servings: ''
    })

    const [currentIngredient, setCurrentIngredient] = useState('')
    const navigate = useNavigate()
    const token = localStorage.getItem('token')

    const handleAddIngredient = () =>{
        if (currentIngredient === '') return
        setForm({...form, ingredients: [...form.ingredients, currentIngredient]})
        setCurrentIngredient('')
    }


    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value })
    }

    const [error, setError] = useState('')

    const handleSubmit = () => {
        if (form.title === '' || form.ingredients.length === 0 || form.steps === '' || form.servings === ''){
            setError('Please fill all required fields.')
            return
        }
        if (isNaN(form.servings) || !Number.isInteger(Number(form.servings)) || Number(form.servings) <= 0){
            setError('Servings must be number greater than 0.')
            return
        }
        setError('')
        fetch('http://127.0.0.1:5000/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ...form, 
                ingredients: form.ingredients.join('\n')
            }
            )
        })
        .then(res => res.json())
        .then (() => {
            navigate('/recipes')
            setForm ({title: '', ingredients: [], steps: '', notes: '', servings: ''})
        })
    }

    return (
        <div>
            <Navbar />
            <h2>Add a Recipe</h2>
            <input
                name = "title"
                placeholder = "Recipe Title"
                value = {form.title}
                onChange = {handleChange}
            />
            <input
                placeholder = "Add ingredient"
                value = {currentIngredient}
                onChange = {(e) => setCurrentIngredient(e.target.value)}
            />
            <button onClick = {handleAddIngredient}>Add Ingredient</button>
            <ul>
                {form.ingredients.map((ing,index) => (
                    <li key = {index} >
                        {ing}
                        <button onClick = {() => {
                            setForm({...form, ingredients: form.ingredients.filter((_,i) => i !== index)})
                        }}>x</button>
                    </li>
                ))}
            </ul>
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
            <input
                name = "servings"
                placeholder = "Servings"
                value = {form.servings}
                onChange = {handleChange}
            />
            {error && <p style = {{color: 'red'}}>{error}</p>}
            <button onClick = {handleSubmit} > Save Recipe</button>
        </div>
    )
}

export default AddRecipe



