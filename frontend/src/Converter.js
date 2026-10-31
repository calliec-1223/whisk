import {useState} from 'react'
import { apiFetch } from './api'
import INGREDIENTS from './ingredients'
import './Converter.css'
import PageHeader from './PageHeader'

function Converter (){
    
    const [form, setForm] = useState({
        ingredient: '',
        amount: '',
        from_unit: 'grams'
    })

    const [result, setResult] = useState (null)
    const [suggestions, setSuggestions] = useState([])

        
    const handleChange = (e) => {
        setForm ({...form, [e.target.name]: e.target.value })
        if (e.target.name === 'ingredient') {
            const filtered = e.target.value === ''
            ? []
            : INGREDIENTS.filter(i =>
                i.includes(e.target.value.toLowerCase())
            )
            setSuggestions(filtered)
        }
    }

    const handleConversion = () => {
        apiFetch('/convert', {
            method: 'POST',
            body: JSON.stringify({...form, 
                ingredient: form.ingredient.toLowerCase()})
        })
        .then (res => res.json())
        .then(data => setResult(data))
        .catch(() => setResult({ error: "Can't reach the server. Please try again." }))
    }


    const unitLabel = (r) => (r.unit === 'grams' || r.amount === 1 ? r.unit : `${r.unit}s`)

    const pickSuggestion = (s) => {
        setForm({...form, ingredient: s.charAt(0).toUpperCase() + s.slice(1)})
        setSuggestions([])
    }

    return (
        <div className="page-enter converter-page">
            <div className="converter-container">
                <PageHeader title="Converter" meta="Grams, cups and teaspoons" />

                {/* A kitchen scale: plate on top, readout window, controls below */}
                <div className="scale">
                    <div className="scale-plate" aria-hidden="true" />
                    <div className="scale-body">
                        <div className="scale-display" role="status">
                            {!result && (
                                <>
                                    <span className="display-number">0</span>
                                    <span className="display-label">Ready to measure!</span>
                                </>
                            )}
                            {result?.error && <span className="display-error">{result.error}</span>}
                            {result && !result.error && (
                                <>
                                    <span className="display-number">
                                        {result.amount}<span className="display-unit">{unitLabel(result)}</span>
                                    </span>
                                    <span className="display-label">of {result.ingredient.toLowerCase()}</span>
                                </>
                            )}
                        </div>

                        <label htmlFor="convert-ingredient">Ingredient</label>
                        <div className="ingredient-wrapper">
                            <input
                                id="convert-ingredient"
                                name="ingredient"
                                autoComplete="off"
                                placeholder="e.g. flour"
                                value={form.ingredient}
                                onChange={handleChange}
                            />
                            {suggestions.length > 0 && (
                                <ul className="suggestions-list">
                                    {suggestions.map(s => (
                                        <li key={s}>
                                            <button type="button" onClick={() => pickSuggestion(s)}>
                                                {s.charAt(0).toUpperCase() + s.slice(1)}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="scale-row">
                            <div>
                                <label htmlFor="convert-amount">Amount</label>
                                <input
                                    id="convert-amount"
                                    name="amount"
                                    inputMode="decimal"
                                    placeholder="e.g. 240"
                                    value={form.amount}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="convert-unit">From</label>
                                <select id="convert-unit" name="from_unit" value={form.from_unit} onChange={handleChange}>
                                    <option value="grams">Grams</option>
                                    <option value="cup">Cups</option>
                                    <option value="teaspoon">Teaspoons</option>
                                </select>
                            </div>
                        </div>

                        <button type="button" className="convert-btn" onClick={handleConversion}>Convert</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Converter