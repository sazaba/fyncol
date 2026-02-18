/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 'sans' es la default. Usamos Inter para todo el texto corrido (botones, párrafos)
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        // 'display' para los H1, H2 grandes. Sora tiene ese toque geométrico moderno.
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Agregamos el color de fondo exacto para mantener consistencia
        dark: {
          900: "#020408", // Fondo principal (Hero)
          800: "#05050A", // Fondo secundario (Navbar scroll)
          700: "#0B1020", // Fondo terciario (Cards/Borders)
        }
      },
      // Animaciones suaves para el fondo (hacen que se sienta "vivo")
      animation: {
        "pulse-slow": "pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 8s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        }
      }
    },
  },
  plugins: [],
}