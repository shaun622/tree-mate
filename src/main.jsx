import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
// Geist Mono is used ONLY for the editorial eyebrow / mono labels.
// Body stays on Inter Variable.
import '@fontsource-variable/geist-mono'
import 'leaflet/dist/leaflet.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
