import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './store/auth'
import { ChainProvider } from './store/chain'
import { ToastProvider } from './store/toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ChainProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ChainProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
