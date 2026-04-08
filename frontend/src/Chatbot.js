import {useState} from 'react'

function Chatbot ({recipes}) {
    
    const [messages,setMessages] = useState([])
    const [input, setInput] = useState('')

    const handleSend = () => {
        if (input === '')
            return
        const userMessage = {role : 'user' , content: input}
        const updatedMessages = [...messages, userMessage]
        setMessages (updatedMessages)
        fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, recipes: recipes })
    })
    .then(res => res.json())
    .then(data => {
        setMessages([...updatedMessages, { role: 'assistant', content: data.response }])
        setInput('')
    })
}
    return (
        <div>
            <h2>Baking Assistant</h2>
            {messages.map((msg,index) => (
                <div key = {index}>
                    <strong>{msg.role === 'user' ? 'You' : 'Whisk AI'}:</strong>
                    <p>{msg.content}</p>
                </div>
            ))}
            <input
                name = "baking assistant"
                placeholder = "Baking Assistant"
                value = {input}
                onChange = {(e) => setInput(e.target.value)}
            />
            <button onClick = {handleSend}>Send</button>
        </div>
    )
}

export default Chatbot