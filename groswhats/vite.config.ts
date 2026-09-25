import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const nativeBuild =
  process.env.NATIVE === '1' ||
  process.env.CAPACITOR === '1' ||
  process.env.ELECTRON === '1'

export default defineConfig({
  // Electron / Capacitor chargent via file:// — chemins absolus /assets cassent l’UI.
  base: nativeBuild ? './' : '/',
  plugins: [
    react(),
    // PWA + service worker inutiles (et risqués) dans l’EXE / APK embarqué.
    VitePWA({
      disable: nativeBuild,
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'brand/*',
        'icons/*',
        'catalog/*.png',
        'tessdata/*.traineddata',
        'tessdata/README.md',
      ],
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,jpg,webp,woff2,json,traineddata,wasm}',
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'AZ POS',
        short_name: 'AZ POS',
        description:
          'Point de vente, stock, WhatsApp, caisse et livraisons pour commerçants en Algérie',
        theme_color: '#0f6b4c',
        background_color: '#0a1628',
        display: 'standalone',
        orientation: 'any',
        lang: 'fr',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
