import {useState} from 'react'
import INGREDIENTS from './ingredients'
import './Converter.css'

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
        fetch('http://127.0.0.1:5000/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({...form, 
                ingredient: form.ingredient.toLowerCase()})
        })
        .then (res => res.json())
        .then(data => setResult(data))
    }


return (
    <div>
        <div className="converter-container">
            <div className="converter-card">
                <h2>Ingredient Converter</h2>
                <p className="converter-subtitle">Convert between grams, cups, and teaspoons</p>
                
                <label>Ingredient</label>
<div className="ingredient-wrapper">
    <input
        name="ingredient"
        placeholder="e.g. flour, sugar, butter..."
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

                <label>Amount</label>
                <input
                    name="amount"
                    placeholder="e.g. 240"
                    value={form.amount}
                    onChange={handleChange}
                />

                <label>From Unit</label>
                <select name="from_unit" value={form.from_unit} onChange={handleChange}>
                    <option value="grams">Grams</option>
                    <option value="cup">Cup</option>
                    <option value="teaspoon">Teaspoon</option>
                </select>

                <button className="convert-btn" onClick={handleConversion}>Convert</button>

                {result && (
                    result.error
                        ? <p className="converter-error">{result.error}</p>
                        : <div className="converter-result">
    <div className="result-amount">
    <span className="result-number">{result.amount}</span> {result.unit.charAt(0).toUpperCase() + result.unit.slice(1)}
</div>
    <div className="result-label">
        of {result.ingredient.charAt(0).toUpperCase() + result.ingredient.slice(1)}
    </div>
</div>
                )}
            </div>
        </div>
    </div>
)
}



export default Converter