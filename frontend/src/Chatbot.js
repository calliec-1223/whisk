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

        const unavailable = 'The baking assistant is unavailable right now. Please try again later.'

        // The server queues the question and replies right away with a job id;
        // we then check for the answer about once a second.
        const waitForAnswer = (jobId, startedAt) => {
            if (Date.now() - startedAt > 90000) {
                reply('This is taking longer than usual. Please try again.')
                setLoading(false)
                return
            }
            authFetch(`/chat/${jobId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'done') {
                        reply(data.response)
                        setLoading(false)
                    } else if (data.status === 'pending') {
                        setTimeout(() => waitForAnswer(jobId, startedAt), 1000)
                    } else {
                        reply(data.error || unavailable)
                        setLoading(false)
                    }
                })
                // A dropped check isn't fatal: try again on the next tick.
                .catch(() => setTimeout(() => waitForAnswer(jobId, startedAt), 1000))
        }

        authFetch('/chat', {
            method: 'POST',
            // A unique id per message: if this request is ever sent twice, the
            // server returns the same answer instead of asking Claude again.
            body: JSON.stringify({ message: text, request_id: crypto.randomUUID() })
        })
        .then(res => {
            // The rate limiter replies with HTML, not JSON
            if (res.status === 429) {
                return { error: "You've hit the hourly question limit. Try again later." }
            }
            return res.json()
        })
        .then(data => {
            if (data.job_id) {
                waitForAnswer(data.job_id, Date.now())  // keeps the "typing" indicator on
            } else if (data.response) {
                reply(data.response)  // server running in sync mode
                setLoading(false)
            } else {
                reply(data.error || 'Something went wrong. Please try again.')
                setLoading(false)
            }
        })
        .catch(() => {
            reply("Can't reach the server. Please try again.")
            setLoading(false)
        })
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