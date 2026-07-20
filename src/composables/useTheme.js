/**
 * useTheme — ViewModel untuk toggle light/dark. Persist ke localStorage,
 * apply lewat atribut data-theme di <html> (dibaca oleh token di theme.css).
 */
import { ref, watchEffect } from 'vue'

const STORAGE_KEY = 'please-blocks:theme'

function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

const theme = ref(getInitialTheme())

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem(STORAGE_KEY, theme.value)
})

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  return { theme, toggleTheme }
}
