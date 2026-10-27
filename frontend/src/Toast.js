import { useEffect } from 'react'
import './Toast.css'

function Toast({ message, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000)
        return () => clearTimeout(timer)
    }, [onClose])

    return (
        <div className="toast" role="status">
            {message}
        </div>
    )
}

export default Toast