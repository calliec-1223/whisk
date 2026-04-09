import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './Chatbot.css'

function Chatbot({ recipes = [] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSend = () => {
        if (input === '') return
        const userMessage = { role: 'user', content: input }
        const updatedMessages = [...messages, userMessage]
        setMessages(updatedMessages)
        setInput('')
        setLoading(true)

        fetch('http://127.0.0.1:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input, recipes: recipes })
        })
        .then(res => res.json())
        .then(data => {
            setMessages([...updatedMessages, { role: 'assistant', content: data.response }])
            setLoading(false)
        })
    }

    return (
        <>
            {/* Floating button */}
            <button className="chat-fab" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? '✕' : '🧁'}
            </button>

            {/* Chat popup */}
            {isOpen && (
                <div className="chat-widget">
                    <div className="chat-widget-header">
                        <h3>Baking Assistant</h3>
                        <p>ask me anything 🫙</p>
                    </div>
                    <div className="chat-messages">
                        {messages.length === 0 && (
                            <p className="chat-empty">Hi! I'm your baking assistant. Ask me anything about your recipes or baking in general!</p>
                        )}
                        {messages.map((msg, index) => (
                            <div key={index} className={`chat-message ${msg.role}`}>
                                <span className="message-label">{msg.role === 'user' ? 'You' : 'Whisk AI'}</span>
                                <div className="message-bubble">
                                    {msg.role === 'assistant'
                                        ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        : msg.content
                                    }
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="chat-message assistant">
                                <span className="message-label">Whisk AI</span>
                                <div className="message-bubble loading-bubble">
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="chat-input-row">
                        <input
                            placeholder="Ask a baking question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button className="chat-send-btn" onClick={handleSend}>Send</button>
                    </div>
                </div>
            )}
        </>
    )
}

export default Chatbot