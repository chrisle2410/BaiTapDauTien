export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        ink: '#f5f5f5',
        shell: '#0f0f0f',
        panel: '#151515',
        panelAlt: '#1f1f1f',
        panelSoft: '#2a2a2a',
        signal: '#ff4d57',
        warning: '#f59e0b',
        danger: '#e50914',
        accent: '#e50914',
        muted: '#a3a3a3',
      },
      boxShadow: {
        panel: '0 24px 70px rgba(0, 0, 0, 0.35)',
        glow: '0 0 0 1px rgba(229, 9, 20, 0.25), 0 18px 50px rgba(229, 9, 20, 0.12)',
      },
      backgroundImage: {
        haze: 'radial-gradient(circle at top left, rgba(229, 9, 20, 0.18), transparent 22%), radial-gradient(circle at top right, rgba(255, 255, 255, 0.06), transparent 18%), linear-gradient(180deg, #111111 0%, #0b0b0b 100%)',
      },
      animation: {
        floatIn: 'floatIn 0.32s ease-out',
        pulseSoft: 'pulseSoft 2.2s ease-in-out infinite',
      },
      keyframes: {
        floatIn: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: 0.72 },
          '50%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
