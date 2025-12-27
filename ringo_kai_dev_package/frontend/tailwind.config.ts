import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "ringo-pink": "#FFB6D9",
        "ringo-rose": "#FF85A2", // Softer rose
        "ringo-pink-soft": "#FFE4E1", // Misty Rose
        "ringo-purple": "#E6D4F0",
        "ringo-red": "#FF5A5F", // More vibrant, friendly red
        "ringo-red-dark": "#D93B3F", // For hover states
        "ringo-green": "#88D498", // Apple leaf green
        "ringo-gold": "#FFD700",
        "ringo-silver": "#C0C0C0",
        "ringo-bronze": "#CD7F32",
        "ringo-poison": "#8A2BE2",
        "ringo-bg": "#FFF0F5", // Lavender Blush - very light pinkish bg
        "ringo-ink": "#4A4A4A", // Softer black
      },
      fontFamily: {
        logo: ["var(--font-logo)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        numeric: ["var(--font-logo)", "sans-serif"], // Use rounded font for numbers too
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
