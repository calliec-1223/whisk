import { createContext, useContext, useState } from 'react'

// Lets any page open the assistant panel without reaching into the DOM.
const ChatContext = createContext(null)

export function ChatProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false)
    return (
        <ChatContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
        </ChatContext.Provider>
    )
}

export function useChat() {
    return useContext(ChatContext)
}
