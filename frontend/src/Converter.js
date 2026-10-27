import {useState} from 'react'
import { apiFetch } from './api'
import INGREDIENTS from './ingredients'
import './Converter.css'
import PageHero from './PageHero'

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


    return (
        <div className="page-enter converter-page">
            <PageHero title="Converter" meta="Grams, cups and teaspoons" overlap />
            <div className="converter-container pulled-up">
                <div className="converter-card">
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
                                    <li key={s} onClick={() => {
                                        setForm({...form, ingredient: s.charAt(0).toUpperCase() + s.slice(1)})
                                        setSuggestions([])
                                    }}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <label htmlFor="convert-amount">Amount</label>
                    <input
                        id="convert-amount"
                        name="amount"
                        inputMode="decimal"
                        placeholder="e.g. 240"
                        value={form.amount}
                        onChange={handleChange}
                    />

                    <label htmlFor="convert-unit">From</label>
                    <select id="convert-unit" name="from_unit" value={form.from_unit} onChange={handleChange}>
                        <option value="grams">Grams</option>
                        <option value="cup">Cups</option>
                        <option value="teaspoon">Teaspoons</option>
                    </select>

                    <button className="convert-btn" onClick={handleConversion}>Convert</button>

                    {result && (
                        result.error
                            ? <p className="converter-error">{result.error}</p>
                            : <div className="converter-result">
                                <div className="result-amount">
                                    <span className="result-number">{result.amount}</span>
                                    {result.unit === 'grams' || result.amount === 1 ? result.unit : `${result.unit}s`}
                                </div>
                                <div className="result-label">
                                    of {result.ingredient.toLowerCase()}
                                </div>
                            </div>
                    )}
                </div>
            </div>
        </div>
    )
}



export default Converter