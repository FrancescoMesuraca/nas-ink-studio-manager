// Il tema del sito si applica come variabili CSS sul contenitore `.site`:
// il titolare sceglie colore, sfondo e carattere senza poter rompere il layout.
// I valori puntano ai design tokens (src/styles/tokens.css): la palette resta in un solo posto.
import type { CSSProperties } from 'react'
import type { SiteTheme } from '../api'

/** Accento predefinito (Bengara), usato se il colore salvato non è valido. */
export const defaultAccent = '#a62b2b'

const palettes = {
  // ink/onInk: le fasce scure che si alternano a quelle chiare (invito finale, piè di pagina).
  dark: { bg: 'var(--color-sumi)', surface: 'var(--color-kokutan)', raised: 'var(--color-sumi-raised)', text: 'var(--color-shiro)', muted: 'var(--color-ash-light)', line: 'rgb(249 246 240 / .14)', error: 'var(--color-bengara-light)', ink: 'var(--color-sumi-deep)', onInk: 'var(--color-shiro)' },
  light: { bg: 'var(--color-shiro)', surface: 'var(--color-washi)', raised: 'var(--color-tatami)', text: 'var(--color-kokutan)', muted: 'var(--color-ash)', line: 'var(--color-tatami-dark)', error: 'var(--danger)', ink: 'var(--color-kokutan)', onInk: 'var(--color-shiro)' },
}

const fonts = {
  classic: { heading: 'var(--font-serif)', body: 'var(--font-sans)', transform: 'none', spacing: '0', weight: '500' },
  modern: { heading: 'var(--font-sans)', body: 'var(--font-sans)', transform: 'none', spacing: '-0.03em', weight: '700' },
  bold: { heading: 'var(--font-display)', body: 'var(--font-sans)', transform: 'uppercase', spacing: '0.03em', weight: '400' },
}

/** Testo bianco o nero sul colore d'accento, secondo la luminanza (WCAG). */
export function onAccent(hex: string) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : defaultAccent
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.36 ? 'var(--color-kokutan)' : '#ffffff'
}

/** Colore di sfondo della pagina intera per il tema scelto (scroll elastico dei telefoni). */
export const pageBackground = (background: SiteTheme['background']) => (palettes[background] ?? palettes.dark).bg

export function themeVars(theme: SiteTheme): CSSProperties {
  const palette = palettes[theme.background] ?? palettes.dark
  const font = fonts[theme.font] ?? fonts.classic
  return {
    '--site-accent': theme.accent,
    '--site-on-accent': onAccent(theme.accent),
    '--site-bg': palette.bg,
    '--site-surface': palette.surface,
    '--site-raised': palette.raised,
    '--site-text': palette.text,
    '--site-muted': palette.muted,
    '--site-line': palette.line,
    '--site-error': palette.error,
    '--site-ink': palette.ink,
    '--site-on-ink': palette.onInk,
    '--site-font-heading': font.heading,
    '--site-font-body': font.body,
    '--site-heading-transform': font.transform,
    '--site-heading-spacing': font.spacing,
    '--site-heading-weight': font.weight,
    colorScheme: theme.background,
  } as CSSProperties
}
