import Navbar from './Navbar'
import Chatbot from './Chatbot'
import { ChatProvider } from './ChatContext'
import { KitchenTimer } from './Timers'

function Layout({ children }) {
    return (
        <ChatProvider>
            <Navbar />
            {children}
            <KitchenTimer />
            <Chatbot />
        </ChatProvider>
    )
}

export default Layout