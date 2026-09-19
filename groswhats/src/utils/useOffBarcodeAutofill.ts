import { useEffect, useRef, useState } from 'react'
import {
  lookupOffProduct,
  looksLikeProductBarcode,
  normalizeBarcode,
  type OffLookupHit,
} from './offLookup'

export type OffFillStatus = 'idle' | 'loading' | 'ok' | 'miss'

/**
 * Quand le code-barres ressemble à un EAN, cherche OFF et appelle onHit
 * (ne remplit que si fillName / fillImage le permettent côté parent).
 */
export function useOffBarcodeAutofill(
  barcode: string,
  onHit: (hit: OffLookupHit) => void,
  enabled = true,
): OffFillStatus {
  const [status, setStatus] = useState<OffFillStatus>('idle')
  const onHitRef = useRef(onHit)
  onHitRef.current = onHit
  const lastOkRef = useRef('')

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      return
    }

    const code = normalizeBarcode(barcode)
    if (!looksLikeProductBarcode(code)) {
      setStatus('idle')
      return
    }
    if (lastOkRef.current === code) {
      setStatus('ok')
      return
    }

    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      setStatus('loading')
      void lookupOffProduct(code, ac.signal).then((hit) => {
        if (ac.signal.aborted) return
        if (!hit) {
          setStatus('miss')
          return
        }
        lastOkRef.current = code
        setStatus('ok')
        onHitRef.current(hit)
      })
    }, 450)

    return () => {
      window.clearTimeout(timer)
      ac.abort()
    }
  }, [barcode, enabled])

  return status
}
