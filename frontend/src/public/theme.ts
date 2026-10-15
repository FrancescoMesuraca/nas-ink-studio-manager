// Il tema del sito si applica come variabili CSS sul contenitore `.site`:
// il titolare sceglie colore, sfondo e carattere senza poter rompere il layout.
import type { CSSProperties } from 'react'
import type { SiteTheme } from '../api'

const palettes = {
  dark: { bg: '#131012', surface: '#1d181b', raised: '#262024', text: '#f4ede6', muted: '#b9ada7', line: 'rgba(255,255,255,.12)', error: '#ff8a9a' },
  light: { bg: '#f7f2ec', surface: '#ffffff', raised: '#efe7df', text: '#1f1a1c', muted: '#665a5d', line: 'rgba(31,26,28,.12)', error: '#b3263c' },
}

const fonts = {
  classic: { heading: "'Playfair Display', 'Cormorant Garamond', Georgia, 'Times New Roman', serif", body: "Inter, ui-sans-serif, system-ui, sans-serif", transform: 'none', spacing: '-0.01em', weight: '700' },
  modern: { heading: "Inter, ui-sans-serif, system-ui, sans-serif", body: "Inter, ui-sans-serif, system-ui, sans-serif", transform: 'none', spacing: '-0.03em', weight: '800' },
  bold: { heading: "'Bebas Neue', Impact, 'Arial Narrow', 'Franklin Gothic Medium', sans-serif", body: "Inter, ui-sans-serif, system-ui, sans-serif", transform: 'uppercase', spacing: '0.02em', weight: '700' },
}

/** Testo bianco o nero sul colore d'accento, secondo la luminanza (WCAG). */
export function onAccent(hex: string) {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#c9435a'
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.36 ? '#141012' : '#ffffff'
}

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
    '--site-font-heading': font.heading,
    '--site-font-body': font.body,
    '--site-heading-transform': font.transform,
    '--site-heading-spacing': font.spacing,
    '--site-heading-weight': font.weight,
    colorScheme: theme.background,
  } as CSSProperties
}
