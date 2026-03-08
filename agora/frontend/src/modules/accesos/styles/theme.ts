const theme = {
  colors: {
    primary: '#0a3ecf',
    secondary: '#ff00ff',
    background: '#000117',
    gradientBackground: `
      radial-gradient(circle at top right, #ffa300 0%, transparent 60%),
      radial-gradient(circle at bottom left, #00fff0 0%, transparent 60%),
      radial-gradient(circle at bottom right, #13a8fe 0%, transparent 60%),
      radial-gradient(circle at top left, #ff00ff 0%, #000117 80%)
    `,
    white: '#ffffff',
    danger: '#dc2626',
    gray: '#d1d5db',
  },
  font: {
    family: 'Montserrat, sans-serif',
    size: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      title: '2rem',
    }
  },
  radius: {
    base: '0.5rem',
    xl: '1rem',
    full: '9999px',
  }
};

export default theme;
