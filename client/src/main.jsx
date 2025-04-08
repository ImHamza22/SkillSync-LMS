import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppCotextProvider } from './context/AppContext.jsx'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
  
  <AppCotextProvider>
    <App />
  </AppCotextProvider>
  </BrowserRouter>,

)
