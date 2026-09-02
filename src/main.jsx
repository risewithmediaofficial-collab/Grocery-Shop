import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Globally disable mouse-wheel changing numbers in any input field across the entire application
document.addEventListener(
  'wheel',
  (e) => {
    if (document.activeElement && document.activeElement.type === 'number') {
      document.activeElement.blur();
    }
    if (e.target && e.target.type === 'number') {
      e.target.blur();
    }
  },
  { passive: true }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
