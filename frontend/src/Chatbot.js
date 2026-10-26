import API_URL from './config'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './Chatbot.css'

function Chatbot({ recipes = [] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

        const handleSend = () => {
        if (input.trim() === '') return
        const sentText = input
        const userMessage = { role: 'user', content: sentText }
        const updatedMessages = [...messages, userMessage]
        setMessages(updatedMessages)
        setInput('')
        setLoading(true)

        const token = localStorage.getItem('token')

        fetch(API_URL + '/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message: sentText })
        })
        .then(res =>
            res.json().catch(() => ({})).then(data => ({ ok: res.ok, status: res.status, data }))
        )
        .then(({ ok, status, data }) => {
            let reply
            if (ok) reply = data.response
            else if (status === 401 || status === 422) reply = 'Please log in again to use the baking assistant.'
            else if (status === 429) reply = "You've reached the chat limit for now. Please try again later."
            else reply = data.error || 'Something went wrong. Please try again.'
            setMessages([...updatedMessages, { role: 'assistant', content: reply }])
        })
        .catch(() => {
            setMessages([...updatedMessages, { role: 'assistant', content: 'Could not reach the server. Please try again.' }])
        })
        .finally(() => setLoading(false))
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