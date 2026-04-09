import { useState, useEffect, useRef } from 'react'
import {useNavigate} from 'react-router-dom'
import './AddRecipe.css'
import Toast from './Toast'

function AddRecipe() {
    const [form, setForm] = useState({
        title: '',
        ingredients: [],
        steps: [],
        notes: '',
        servings: ''
    })

    const [currentIngredient, setCurrentIngredient] = useState('')
    const [currentStep, setCurrentStep] = useState('')
    const [showToast, setShowToast] = useState(false)
    const timerRef = useRef(null)

    const moveStep = (index, direction) => {
    const newSteps = [...form.steps]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newSteps.length) return
    ;[newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]]
    setForm({...form, steps: newSteps})
}

    useEffect(() => {
    return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
    }
}, [])

    const handleAddStep = () => {
    if (currentStep === '') return
    setForm({...form, steps: [...form.steps, currentStep]})
    setCurrentStep('')
}

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
        if (form.title === '' || form.ingredients.length === 0 || form.steps.length === 0 || form.servings === ''){
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
                ingredients: form.ingredients.join('\n'),
                steps: form.steps.join('\n')
            }
            )
        })
        .then(res => res.json())
.then(data => {
    if (data.message === 'Recipe saved!') {
        setShowToast(true)
        timerRef.current = setTimeout(() => {
            navigate('/recipes')
        }, 1500)
        setForm({title: '', ingredients: [], steps: [], notes: '', servings: ''})
    } else {
        setError('Something went wrong. Please try again.')
    }
})
    }

    return (
    <div className = "page-enter">
        <div className="add-container">
            <div className="add-card">
                <h2>Add a Recipe</h2>
                <label>Recipe Title</label>
                <input name="title" placeholder="e.g. Brown Butter Chocolate Chip Cookies" value={form.title} onChange={handleChange} />
                
                <label>Ingredients</label>
                <div className="ingredient-input-row">
                    <input placeholder="e.g. 2 cups flour" value={currentIngredient} onChange={(e) => setCurrentIngredient(e.target.value)} />
                    <button onClick={handleAddIngredient}>+ Add</button>
                </div>
                <ul className="ingredient-list">
                    {form.ingredients.map((ing, index) => (
                        <li key={index}>
                            {ing}
                            <button onClick={() => {
                                setForm({...form, ingredients: form.ingredients.filter((_, i) => i !== index)})
                            }}>✕</button>
                        </li>
                    ))}
                </ul>

                <label>Steps</label>
<div className="ingredient-input-row">
    <input
        placeholder="e.g. Preheat oven to 350°F"
        value={currentStep}
        onChange={(e) => setCurrentStep(e.target.value)}
    />
    <button onClick={handleAddStep}>+ Add</button>
</div>
<ul className="ingredient-list">
    {form.steps.map((step, index) => (
        <li key={index}>
            <span><strong>{index + 1}.</strong> {step}</span>
            <div style={{display: 'flex', gap: '4px'}}>
                <button onClick={() => moveStep(index, -1)}>↑</button>
                <button onClick={() => moveStep(index, 1)}>↓</button>
                <button onClick={() => {
                    setForm({...form, steps: form.steps.filter((_, i) => i !== index)})
                }}>✕</button>
            </div>
        </li>
    ))}
</ul>
                <label>Notes (optional)</label>
                <input name="notes" placeholder="Tips, variations, storage..." value={form.notes} onChange={handleChange} />
                
                <label>Servings</label>
                <input name="servings" placeholder="e.g. 12 cookies" value={form.servings} onChange={handleChange} />
                
                {error && <p style={{color: 'var(--primary)', marginBottom: '12px'}}>{error}</p>}
                <button className="save-btn" onClick={handleSubmit}>Save Recipe 🧁</button>
                {showToast && <Toast message="Recipe saved!" onClose={() => setShowToast(false)} />}

            </div>
        </div>
    </div>
)
}

export default AddRecipe



