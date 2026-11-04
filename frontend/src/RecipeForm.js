import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from './categories'
import './AddRecipe.css'
import Toast from './Toast'
import PageHeader from './PageHeader'
import { useCelebrate } from './Celebrate'
import { authFetch } from './api'

const MAX_SERVINGS = 1000

// Shared form for adding and editing a recipe.
// `save(body)` sends the recipe and returns the fetch promise.
function RecipeForm({ heading, saveLabel, toastMessage, initialRecipe, save, doneTo = '/recipes', allowImport = false }) {
    const [form, setForm] = useState({
        title: initialRecipe?.title || '',
        ingredients: initialRecipe ? initialRecipe.ingredients.split('\n') : [],
        steps: initialRecipe ? initialRecipe.steps.split('\n') : [],
        notes: initialRecipe?.notes || '',
        servings: initialRecipe?.servings ?? '',
        category: initialRecipe?.category || '',
        source_url: initialRecipe?.source_url || '',
    })
    const [currentIngredient, setCurrentIngredient] = useState('')
    const [currentStep, setCurrentStep] = useState('')
    const [showToast, setShowToast] = useState(false)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const timerRef = useRef(null)
    const navigate = useNavigate()
    const celebrate = useCelebrate()

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [])

    const handleChange = (e) => {
        setForm({...form, [e.target.name]: e.target.value})
    }

    const handleAddIngredient = () => {
        if (currentIngredient.trim() === '') return
        setForm({...form, ingredients: [...form.ingredients, currentIngredient.trim()]})
        setCurrentIngredient('')
    }

    const handleAddStep = () => {
        if (currentStep.trim() === '') return
        setForm({...form, steps: [...form.steps, currentStep.trim()]})
        setCurrentStep('')
    }

    const moveStep = (index, direction) => {
        const newSteps = [...form.steps]
        const swapIndex = index + direction
        if (swapIndex < 0 || swapIndex >= newSteps.length) return
        ;[newSteps[index], newSteps[swapIndex]] = [newSteps[swapIndex], newSteps[index]]
        setForm({...form, steps: newSteps})
    }

    const handleSubmit = () => {
        if (form.title.trim() === '' || form.ingredients.length === 0 || form.steps.length === 0 || form.servings === '') {
            setError('Add a title, servings, and at least one ingredient and step.')
            return
        }
        const servings = Number(form.servings)
        if (!Number.isInteger(servings) || servings < 1 || servings > MAX_SERVINGS) {
            setError(`Servings must be a whole number from 1 to ${MAX_SERVINGS}.`)
            return
        }
        setError('')
        setSaving(true)
        save(JSON.stringify({
            ...form,
            ingredients: form.ingredients.join('\n'),
            steps: form.steps.join('\n'),
        }))
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (ok) {
                setShowToast(true)
                celebrate(data.new_stickers)
                timerRef.current = setTimeout(() => navigate(doneTo), 1500)
            } else {
                setError(data.error || 'Something went wrong. Please try again.')
                setSaving(false)
            }
        })
        .catch(() => {
            setError("Can't reach the server. Please try again.")
            setSaving(false)
        })
    }

    return (
        <div className="page-enter form-page">
            <div className="add-container">
                <PageHeader title={heading} />
                {allowImport && <ImportBox onImported={(recipe) => setForm({
                    title: recipe.title,
                    ingredients: recipe.ingredients,
                    steps: recipe.steps,
                    notes: '',
                    servings: recipe.servings ?? '',
                    category: recipe.category,
                    source_url: recipe.source_url,
                })} />}
                <div className="add-card">
                    <label htmlFor="recipe-title">Title</label>
                    <input
                        id="recipe-title"
                        name="title"
                        maxLength={100}
                        placeholder="e.g. Brown butter chocolate chip cookies"
                        value={form.title}
                        onChange={handleChange}
                    />

                    <label htmlFor="recipe-ingredient">Ingredients</label>
                    <div className="ingredient-input-row">
                        <input
                            id="recipe-ingredient"
                            placeholder="e.g. 2 cups flour"
                            value={currentIngredient}
                            onChange={(e) => setCurrentIngredient(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleAddIngredient()}
                        />
                        <button type="button" className="btn-secondary" onClick={handleAddIngredient}>Add</button>
                    </div>
                    <ul className="ingredient-list">
                        {form.ingredients.map((ing, index) => (
                            <li key={index}>
                                <span>{ing}</span>
                                <button
                                    aria-label={`Remove ${ing}`}
                                    onClick={() => setForm({...form, ingredients: form.ingredients.filter((_, i) => i !== index)})}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>

                    <label htmlFor="recipe-step">Steps</label>
                    <div className="ingredient-input-row">
                        <input
                            id="recipe-step"
                            placeholder="e.g. Preheat the oven to 350°F"
                            value={currentStep}
                            onChange={(e) => setCurrentStep(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleAddStep()}
                        />
                        <button type="button" className="btn-secondary" onClick={handleAddStep}>Add</button>
                    </div>
                    <ul className="ingredient-list">
                        {form.steps.map((step, index) => (
                            <li key={index}>
                                <span className="step-text"><span className="step-badge">{index + 1}</span>{step}</span>
                                <div className="row-actions">
                                    <button aria-label="Move step up" onClick={() => moveStep(index, -1)}>↑</button>
                                    <button aria-label="Move step down" onClick={() => moveStep(index, 1)}>↓</button>
                                    <button
                                        aria-label="Remove step"
                                        onClick={() => setForm({...form, steps: form.steps.filter((_, i) => i !== index)})}
                                    >
                                        ×
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <label htmlFor="recipe-notes">Notes (optional)</label>
                    <input
                        id="recipe-notes"
                        name="notes"
                        maxLength={200}
                        placeholder="Tips, variations, storage"
                        value={form.notes}
                        onChange={handleChange}
                    />

                    <div className="form-row">
                        <div>
                            <label htmlFor="recipe-servings">Servings</label>
                            <input
                                id="recipe-servings"
                                name="servings"
                                inputMode="numeric"
                                placeholder="e.g. 12"
                                value={form.servings}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="recipe-category">Category</label>
                            <select id="recipe-category" name="category" value={form.category} onChange={handleChange}>
                                <option value="">Choose a category</option>
                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {error && <p className="form-error">{error}</p>}
                    <button type="button" className="save-btn" onClick={handleSubmit} disabled={saving}>{saveLabel}</button>
                    {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}
                </div>
            </div>
        </div>
    )
}

// Paste a link to a recipe online; the server reads the page and the form fills in
function ImportBox({ onImported }) {
    const [url, setUrl] = useState('')
    const [status, setStatus] = useState('idle') // idle | reading | done
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const importRecipe = (e) => {
        e.preventDefault()
        if (!url.trim()) return
        setStatus('reading')
        setError('')
        authFetch('/recipes/import', { method: 'POST', body: JSON.stringify({ url: url.trim() }) })
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok) throw new Error(data.error)
                onImported(data)
                setStatus('done')
                setMessage(data.method === 'ai'
                    ? 'Filled in by the assistant. Double-check the amounts and steps before you save.'
                    : 'Filled in! Check everything over before you save.')
            })
            .catch((err) => {
                setStatus('idle')
                // A TypeError means the request never reached the server
                setError(err instanceof TypeError || !err.message
                    ? "Can't reach the server. Please try again."
                    : err.message)
            })
    }

    return (
        <form className="import-box" onSubmit={importRecipe}>
            <label htmlFor="import-url">Found a recipe online? Paste the link to fill this in.</label>
            <div className="ingredient-input-row">
                <input
                    id="import-url"
                    type="url"
                    inputMode="url"
                    placeholder="https://"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
                <button type="submit" disabled={status === 'reading'}>
                    {status === 'reading' ? 'Reading…' : 'Fill in'}
                </button>
            </div>
            <p className="import-status" role="status">
                {status === 'reading' ? 'Reading the page…' : status === 'done' ? message : ''}
            </p>
            {error && <p className="form-error">{error}</p>}
        </form>
    )
}

export default RecipeForm
