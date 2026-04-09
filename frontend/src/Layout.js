import Navbar from './Navbar'
import Chatbot from './Chatbot'

function Layout({ children }) {
    return (
        <div>
            <Navbar />
            {children}
            <Chatbot />
        </div>
    )
}

export default Layout