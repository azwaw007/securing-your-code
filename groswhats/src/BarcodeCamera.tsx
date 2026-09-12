import { useEffect, useId, useRef, useState } from 'react'
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode'
import type { Language } from './types'
import { t } from './i18n'
import { playBarcodeOk } from './utils/sfx'

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE,
]

export function isBarcodeCameraSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

/** Overlay caméra pour lire un code-barres */
export function BarcodeCameraModal({
  lang,
  onDetect,
  onClose,
}: {
  lang: Language
  onDetect: (code: string) => void
  onClose: () => void
}) {
  const reactId = useId().replace(/:/g, '')
  const readerId = `az-barcode-reader-${reactId}`
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const doneRef = useRef(false)
  const onDetectRef = useRef(onDetect)
  const onCloseRef = useRef(onClose)
  onDetectRef.current = onDetect
  onCloseRef.current = onClose

  useEffect(() => {
    let cancelled = false
    const scanner = new Html5Qrcode(readerId, {
      formatsToSupport: BARCODE_FORMATS,
      verbose: false,
    })
    scannerRef.current = scanner

    async function start() {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: (viewW, viewH) => {
              const w = Math.min(viewW * 0.92, 360)
              const h = Math.min(viewH * 0.28, 140)
              return { width: Math.floor(w), height: Math.floor(h) }
            },
            aspectRatio: 1.333,
            disableFlip: false,
          },
          (decodedText) => {
            const code = decodedText.trim()
            if (!code || doneRef.current) return
            doneRef.current = true
            void scanner
              .stop()
              .catch(() => undefined)
              .finally(() => {
                playBarcodeOk()
                onDetectRef.current(code)
                onCloseRef.current()
              })
          },
          () => {
            /* frame sans code — ignorer */
          },
        )
        if (!cancelled) setBusy(false)
      } catch {
        if (!cancelled) {
          setError(t(lang, 'barcodeCamDenied'))
          setBusy(false)
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      const s = scannerRef.current
      scannerRef.current = null
      if (s?.isScanning) {
        void s.stop().catch(() => undefined)
      }
      try {
        s?.clear()
      } catch {
        /* ignore */
      }
    }
  }, [lang, readerId])

  return (
    <div className="barcode-cam-overlay" role="dialog" aria-modal="true">
      <div className="barcode-cam-card">
        <h3>📷 {t(lang, 'barcodeCamTitle')}</h3>
        <p className="muted">{t(lang, 'barcodeCamHint')}</p>
        {error ? <div className="notice warn">{error}</div> : null}
        <div id={readerId} className="barcode-cam-reader" />
        {busy && !error ? (
          <div className="muted">{t(lang, 'barcodeCamStarting')}</div>
        ) : null}
        <button
          type="button"
          className="btn secondary block"
          style={{ marginTop: 12 }}
          onClick={() => {
            const s = scannerRef.current
            if (s?.isScanning) {
              void s.stop().catch(() => undefined).finally(onClose)
            } else {
              onClose()
            }
          }}
        >
          {t(lang, 'cancel')}
        </button>
      </div>
    </div>
  )
}

/** Champ code-barres produit + bouton caméra */
export function ProductBarcodeField({
  lang,
  value,
  onChange,
}: {
  lang: Language
  value: string
  onChange: (v: string) => void
}) {
  const [camOpen, setCamOpen] = useState(false)

  return (
    <>
      <div className="field">
        <label>⬛ {t(lang, 'barcode')}</label>
        <div className="barcode-product-row">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="EAN / code…"
            autoComplete="off"
            inputMode="numeric"
          />
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              if (!isBarcodeCameraSupported()) {
                window.alert(t(lang, 'barcodeCamUnsupported'))
                return
              }
              setCamOpen(true)
            }}
            title={t(lang, 'barcodeCamTitle')}
            aria-label={t(lang, 'barcodeCamTitle')}
          >
            📷
          </button>
        </div>
        <div className="muted" style={{ marginTop: 4 }}>
          {t(lang, 'barcodeCamFieldHint')}
        </div>
      </div>
      {camOpen ? (
        <BarcodeCameraModal
          lang={lang}
          onDetect={(code) => onChange(code)}
          onClose={() => setCamOpen(false)}
        />
      ) : null}
    </>
  )
}
