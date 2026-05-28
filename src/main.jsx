import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app'
import Admin from './Admin'

const isAdmin = window.location.pathname === '/admin'

ReactDOM.createRoot(document.getElementById('root')).render(
  isAdmin ? <Admin /> : <App />
)
