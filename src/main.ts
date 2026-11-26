import '@fontsource/syne/latin-700.css'
import '@fontsource/syne/latin-ext-700.css'
import '@fontsource/syne/latin-800.css'
import '@fontsource/syne/latin-ext-800.css'
import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-ext-400.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-ext-500.css'
import './style.css'
import { boot } from './game'

boot()

// Ana ekrana eklenebilir uygulama (PWA): yalnız derlenmiş sürümde, göreli yolla (GitHub Pages alt klasörü için).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
