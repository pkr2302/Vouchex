import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'
import './styles/mobile.css'
import ApiErrorDialog from './components/ApiErrorDialog.jsx'
import { SimulatorProvider } from './context/SimulatorContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SimulatorProvider>
      <ApiErrorDialog />
      <App />
    </SimulatorProvider>
  </React.StrictMode>,
)
