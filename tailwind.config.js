/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#1a1a1a',
        surface:  '#222222',
        surface2: '#2c2c2c',
        surface3: '#363636',
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
        sans:  ["'Geist'", 'sans-serif'],
        serif: ["'Lora'", 'serif'],
      },
      fontSize: {
        'xs':  ['12px', { lineHeight: '1.5' }],
        'sm':  ['13px', { lineHeight: '1.6' }],
        'base':['15px', { lineHeight: '1.65' }],
        'lg':  ['17px', { lineHeight: '1.6' }],
        'xl':  ['20px', { lineHeight: '1.5' }],
        '2xl': ['24px', { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [],
}
