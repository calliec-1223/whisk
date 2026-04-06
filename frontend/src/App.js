import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetch('http://127.0.0.1:5000/ping')
      .then(res => res.json())
      .then(data => setStatus(data.message))
  }, [])

  return (
    <div>
      <h1>Whisk 🧁</h1>
      <p>{status}</p>
    </div>
  )
}

export default App