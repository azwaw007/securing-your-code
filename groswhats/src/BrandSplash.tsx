import { useEffect, useState } from 'react'
import { APP_BRAND } from './brand'

const SPLASH_KEY = 'az-pos-splash-v1'
const SPLASH_MS = 1400

/** Splash marque au démarrage (1× par session navigateur). */
export function BrandSplash() {
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(SPLASH_KEY) !== '1'
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (!visible) return
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SPLASH_KEY, '1')
      } catch {
        /* ignore */
      }
      setVisible(false)
    }, SPLASH_MS)
    return () => window.clearTimeout(t)
  }, [visible])

  if (!visible) return null

  return (
    <div className="brand-splash" role="img" aria-label={APP_BRAND.name}>
      <img
        src={APP_BRAND.logoStack}
        alt={APP_BRAND.name}
        className="brand-splash-logo"
        width={280}
        height={280}
        decoding="async"
      />
    </div>
  )
}
