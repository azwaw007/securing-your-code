import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrandSplash } from './BrandSplash.tsx'
import { LicenseGate } from './license/LicenseGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrandSplash />
    <LicenseGate>
      <App />
    </LicenseGate>
  </StrictMode>,
)
