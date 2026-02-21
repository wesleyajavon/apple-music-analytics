import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-surface": "var(--card-surface)",
        "card-border": "var(--card-border)",
        border: "var(--border)",
        muted: "var(--muted)",
        accent: {
          rose: "#fa586a",
          pink: "#ec4899",
          violet: "#8b5cf6",
          indigo: "#6366f1",
          cyan: "#06b6d4",
          emerald: "#10b981",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--card-shadow)",
        "card-hover": "var(--card-shadow-hover)",
        glow: "0 0 40px -10px rgb(139 92 246 / 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;

