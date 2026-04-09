import {useState} from 'react'
import INGREDIENTS from './ingredients'
import Navbar from './Navbar'

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
            body: JSON.stringify(form)
        })
        .then (res => res.json())
        .then(data => setResult(data))
    }


return (
    <div>
        <Navbar />
        <h2>Converter</h2>
        <input
            name = "ingredient"
            placeholder = "Ingredient"
            value = {form.ingredient}
            onChange = {handleChange}
        />
        {suggestions.length > 0 && (
            <ul>
                {suggestions.map(s => (
                    <li key = {s} onClick={() => {
                        setForm({...form, ingredient:s})
                        setSuggestions([])
                    }}>
                        {s}
                    </li>
                ))}
            </ul>
        )}
        <input
            name = "amount"
            placeholder = "Amount"
            value = {form.amount}
            onChange = {handleChange}
        />
        <select name = "from_unit" value = {form.from_unit} onChange= {handleChange}>
            <option value = "grams">Grams</option>
            <option value = "cup">Cups</option>
            <option value = "teaspoon">Teaspoons</option>
        </select>
        <button onClick = {handleConversion}>Convert</button>
        {result && ( 
            result.error 
            ? <p style = {{color: 'red'}}>{result.error}</p>
            : <p>{result.amount} {result.unit} </p>
            )}
    </div>
)
}



export default Converter