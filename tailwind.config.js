/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#0d0f13',
        surface:  '#141720',
        surface2: '#1a1e28',
        surface3: '#222636',
        border:   'rgba(255,255,255,0.07)',
        border2:  'rgba(255,255,255,0.12)',
        accent:   '#3a7bd5',
        accent2:  '#c8b89a',
        text:     '#e8edf5',
        muted:    'rgba(232,237,245,0.45)',
        muted2:   'rgba(232,237,245,0.25)',
        'film-l': '#a06040',
        'film-bg':'rgba(160,96,64,0.08)',
        'book-l': '#4a7a5a',
        'book-bg':'rgba(74,122,90,0.08)',
        'goal-l': '#b05a30',
        'goal-bg':'rgba(176,90,48,0.08)',
        'event-l':'#2874a6',
      },
      fontFamily: {
        sans: ["'DM Sans'", 'sans-serif'],
        serif: ["'Playfair Display'", 'serif'],
      },
    },
  },
  plugins: [],
}
