import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "ringo-pink": "#FFB6D9",
        "ringo-rose": "#FF4B8F",
        "ringo-pink-soft": "#FFC0CB",
        "ringo-purple": "#E6D4F0",
        "ringo-red": "#E63946",
        "ringo-gold": "#FFD700",
        "ringo-silver": "#C0C0C0",
        "ringo-bronze": "#CD7F32",
        "ringo-poison": "#8A2BE2",
        "ringo-bg": "#FFF5F9",
        "ringo-ink": "#333333",
      },
      fontFamily: {
        logo: ["'Zen Maru Gothic'", "'Hiragino Maru Gothic ProN'", "sans-serif"],
        body: ["'Hiragino Kaku Gothic ProN'", "'Segoe UI'", "sans-serif"],
        numeric: ["'Roboto'", "sans-serif"],
      },
      borderRadius: {
        "ringo-pill": "1.5rem",
      },
      boxShadow: {
        "ringo-card": "0 10px 30px rgba(255, 182, 217, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
