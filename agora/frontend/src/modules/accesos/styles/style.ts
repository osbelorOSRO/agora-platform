import theme from "./theme";

const style = {
  // 🔄 Flip card
  flipWrapper: 'relative w-[360px] h-[320px] perspective',
  flipCard: 'transition-transform duration-700 transform-style-preserve-3d w-full h-full',
  flipFront: 'absolute w-full h-full backface-hidden',
  flipBack: 'absolute w-full h-full backface-hidden rotate-y-180',

  // 🧾 Tarjetas y secciones
  card: `bg-[${theme.colors.white}] rounded-[${theme.radius.xl}] shadow p-6`,
  subtitle: `text-[${theme.font.size.base}] text-[${theme.colors.gray}] mb-2`,
  title: `
  text-2xl
  font-bold
  text-white
  text-center
  mb-6
  `,

  // 🧑‍💻 Inputs
  input: `
  w-full p-2
  bg-white/10 backdrop-blur-md
  border border-white/20
  rounded-full
  text-white placeholder-white/70
  shadow-inner
  focus:outline-none focus:ring-2 focus:ring-[#cf0060]
  hover:shadow-[0_0_8px_2px_#cf0060]
  focus:shadow-[0_0_12px_3px_#cf0060]
  transition-all duration-200
  `,

  // ✅ Botones
  buttonDanger: `bg-[${theme.colors.danger}] text-[${theme.colors.white}] px-4 py-2 rounded-[${theme.radius.xl}] hover:bg-red-700 transition-colors`,
  buttonIcon: `p-2 hover:bg-[${theme.colors.gray}] rounded-full`,
  buttonPrimary: `
  px-6 py-2
  border-2 border-[#cf0060]
  text-white
  rounded-full
  bg-transparent
  hover:bg-gradient-to-r hover:from-[#cf0060] hover:to-[#ff00ff]
  hover:shadow-[0_0_12px_4px_#cf0060]
  active:shadow-[0_0_16px_6px_#cf0060]
  active:scale-[0.95]
  focus:outline-none
  transition-all duration-200 ease-in-out
  mx-auto block
  `,

  // 🔗 Links
  link: `
  w-full
  block
  text-sm
  text-white
  text-center
  mt-4
  hover:text-[#cf0060]
  transition-colors duration-200
  `,

  // glasscard
  glassCard: `
  bg-white/10
  backdrop-blur-md
  border border-white/20
  shadow-lg
  rounded-3xl
  p-6
  `,

  glassBackground: `
    flex items-center justify-center
    min-h-screen
    bg-radial
  `,
  mainContent: 'flex-1 p-6',

  table: `
  w-full
  border-collapse
  text-sm
  font-[Montserrat]
  text-left
  `,

  tableHeader: `
  border border-white/10
  px-2 py-1
  text-white
  text-sm
  bg-white/10
  backdrop-blur
  font-[Montserrat]
  `,

  celdaTabla: `
  border border-white/10
  px-2 py-1
  text-sm
  align-middle
  font-[Montserrat]
  text-white
  `,

  filaTabla: `
  border-b border-white/10
  hover:bg-white/5
  transition-colors
  `,

  accionesCell: `
  text-center
  align-middle
  px-2 py-1
  border border-white/10
  [&>div]:flex [&>div]:items-center [&>div]:justify-center [&>div]:gap-2
  `,

  checkboxPermiso: `
  accent-[#cf0060]
  w-4 h-4
  align-middle
  focus:ring-0
  transition
  `,

  fontBase: `
  font-[Montserrat]
  text-sm
  text-white
  `,
  layout: 'min-h-screen w-full flex overflow-auto scrollbar-custom'
};

export default style;
