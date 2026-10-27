import { useState } from 'react'
import { authFetch } from './api'
import { useChat } from './ChatContext'
import ReactMarkdown from 'react-markdown'
import './Chatbot.css'

function Chatbot() {
    const { isOpen, setIsOpen } = useChat()
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSend = () => {
        const text = input.trim()
        if (text === '' || loading) return
        const userMessage = { role: 'user', content: text }
        const updatedMessages = [...messages, userMessage]
        setMessages(updatedMessages)
        setInput('')
        setLoading(true)

        const reply = (content) => setMessages([...updatedMessages, { role: 'assistant', content }])

        authFetch('/chat', {
            method: 'POST',
            body: JSON.stringify({ message: text })
        })
        .then(res => {
            // The rate limiter replies with HTML, not JSON
            if (res.status === 429) {
                return { error: "You've hit the hourly question limit. Try again later." }
            }
            return res.json()
        })
        .then(data => {
            if (data.response) {
                reply(data.response)
            } else {
                reply(data.error || 'Something went wrong. Please try again.')
            }
        })
        .catch(() => reply("Can't reach the server. Please try again."))
        .finally(() => setLoading(false))
    }

    return (
        <>
            <button
                className="chat-fab"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                {isOpen ? 'Close' : 'Assistant'}
            </button>

            {isOpen && (
                <div className="chat-widget" role="dialog" aria-label="Assistant">
                    <div className="chat-widget-header">
                        <p className="eyebrow"><span className="label-dot" aria-hidden="true" /> Assistant</p>
                        <h3>Baking questions</h3>
                        <p>Can see the recipes you've saved.</p>
                    </div>
                    <div className="chat-messages">
                        {messages.length === 0 && (
                            <p className="chat-empty">Ask about a recipe, a substitution, or a bake that didn't turn out.</p>
                        )}
                        {messages.map((msg, index) => (
                            <div key={index} className={`chat-message ${msg.role}`}>
                                <span className="message-label">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
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
                                <span className="message-label">Assistant</span>
                                <div className="message-bubble loading-bubble" aria-label="Loading">
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                    <span className="dot"></span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="chat-input-row">
                        <input
                            placeholder="Ask a question"
                            aria-label="Message"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
                        />
                        <button onClick={handleSend}>Send</button>
                    </div>
                </div>
            )}
        </>
    )
}

export default Chatbot