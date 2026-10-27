import Navbar from './Navbar'
import Chatbot from './Chatbot'
import { ChatProvider } from './ChatContext'

function Layout({ children }) {
    return (
        <ChatProvider>
            <Navbar />
            {children}
            <Chatbot />
        </ChatProvider>
    )
}

export default Layout