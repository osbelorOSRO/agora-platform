/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    'bg-[#CDFDD1]', 'bg-[#57E56A]', 'bg-[#45B954]', 'bg-[#338F40]', 'bg-[#23682C]',
    'bg-[#13421A]', 'bg-[#062009]', 'bg-[#CDFDD1]', 'bg-[#57E56A]', 'bg-[#45B954]',
    'text-white', 'text-black',
  ],
  theme: {
    extend: {
      fontFamily: {
        montserrat: ['Poppins', 'sans-serif'],
      },
      colors: {
        fondoPagina: 'var(--fondoPagina)',
        fondoCard: 'var(--fondoCard)',
        fondoClient: 'var(--fondoClient)',
        fondoSection: 'var(--fondoSection)',
        azulPrimario: 'var(--azulPrimario)',
        azulOscuro: 'var(--azulOscuro)',
        textoClaro: 'var(--textoClaro)',
        textoOscuro: 'var(--textoOscuro)',
        textoTimestamp: 'var(--textoTimestamp)',
        textoInput: 'var(--textoInput)',
        textoOutput: 'var(--textoOutput)',
        fondoInput: 'var(--fondoInput)',
        fondoOutput: 'var(--fondoOutput)',
        borde: 'var(--borde)',
        textoTag: 'var(--textoTag)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
