import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  // Activa dark mode por clase — permite toggle programático
  darkMode: "class",

  safelist: [
    // Colores dinámicos usados en componentes de estado/score
    "bg-[#CDFDD1]", "bg-[#57E56A]", "bg-[#45B954]",
    "bg-[#338F40]", "bg-[#23682C]", "bg-[#13421A]", "bg-[#062009]",
    "text-white", "text-black",
  ],

  theme: {
    extend: {
      // ── Tipografía ──────────────────────────────────────────────
      fontFamily: {
        sans:       ["Poppins", "sans-serif"],
        montserrat: ["Poppins", "sans-serif"], // alias compatibilidad
      },

      // ── Colores — convención shadcn/ui ───────────────────────────
      // Todos apuntan a CSS variables → un solo cambio en globals.css
      // propaga a todo el sistema, incluyendo light mode.
      colors: {
        // ── Tokens estándar ──
        background: "var(--background)",
        foreground: "var(--foreground)",

        card: {
          DEFAULT:    "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT:    "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT:    "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover:      "var(--primary-hover)",
        },
        secondary: {
          DEFAULT:    "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT:    "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT:    "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT:    "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        success: {
          DEFAULT:    "var(--success)",
          foreground: "var(--success-foreground)",
        },
        warning: {
          DEFAULT:    "var(--warning)",
          foreground: "var(--warning-foreground)",
        },
        border:  "var(--border)",
        "border-primary": "var(--border-primary)",
        input:   "var(--input)",
        ring:    "var(--ring)",

        // ── Aliases de compatibilidad (NO usar en código nuevo) ──
        fondoPagina:    "var(--fondoPagina)",
        fondoCard:      "var(--fondoCard)",
        fondoClient:    "var(--fondoClient)",
        fondoSection:   "var(--fondoSection)",
        azulPrimario:   "var(--azulPrimario)",
        azulOscuro:     "var(--azulOscuro)",
        textoClaro:      "var(--textoClaro)",
        textoOscuro:     "var(--textoOscuro)",
        textoSecundario: "var(--textoSecundario)",
        textoTimestamp:  "var(--textoTimestamp)",
        textoInput:     "var(--textoInput)",
        textoOutput:    "var(--textoOutput)",
        textoTag:       "var(--textoTag)",
        fondoInput:     "var(--fondoInput)",
        fondoOutput:    "var(--fondoOutput)",
        borde:          "var(--borde)",
      },

      // ── Radios ───────────────────────────────────────────────────
      borderRadius: {
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        full: "var(--radius-full)",
      },

      // ── Animaciones ──────────────────────────────────────────────
      animation: {
        "fade-in":  "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(-5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },

  plugins: [
    // ── Utilidades glass ──────────────────────────────────────────
    plugin(({ addUtilities }) => {
      addUtilities({
        // Uso: className="glass-sm rounded-xl p-4"
        ".glass-sm": {
          "background-color": "var(--glass-bg-sm)",
          "border":           "1px solid var(--glass-border)",
        },
        ".glass-md": {
          "background-color": "var(--glass-bg-md)",
          "border":           "1px solid var(--glass-border)",
        },
        ".glass-lg": {
          "background-color": "var(--glass-bg-lg)",
          "border":           "1px solid var(--glass-border)",
        },
        // Fondo de app con gradiente radial
        // Uso: className="bg-app min-h-screen"
        ".bg-app": {
          "background":       "var(--gradient-bg)",
          "background-color": "var(--background)",
        },
      });
    }),
  ],
};

export default config;
