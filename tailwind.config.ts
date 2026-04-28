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
        background: "rgb(var(--background-rgb) / <alpha-value>)",
        foreground: "rgb(var(--foreground-rgb) / <alpha-value>)",
        card: "rgb(var(--card-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        "surface-raised": "rgb(var(--surface-raised-rgb) / <alpha-value>)",
        "surface-glass": "rgb(var(--surface-glass-rgb) / 0.78)",
        "surface-sidebar": "rgb(var(--surface-sidebar-rgb) / <alpha-value>)",
        "surface-dashboard": "rgb(var(--surface-dashboard-rgb) / <alpha-value>)",
        "card-surface": "var(--card-surface)",
        "card-border": "var(--card-border)",
        border: "rgb(var(--border-rgb) / <alpha-value>)",
        muted: "rgb(var(--muted-rgb) / <alpha-value>)",
        primary: "rgb(var(--primary-rgb) / <alpha-value>)",
        "primary-hover": "var(--primary-hover)",
        "primary-foreground": "var(--primary-foreground)",
        ring: "var(--ring)",
        accent: {
          rose: "rgb(var(--brand-rose-rgb) / <alpha-value>)",
          pink: "rgb(var(--brand-pink-rgb) / <alpha-value>)",
          violet: "rgb(var(--brand-violet-rgb) / <alpha-value>)",
          indigo: "rgb(var(--brand-indigo-rgb) / <alpha-value>)",
          cyan: "rgb(var(--brand-cyan-rgb) / <alpha-value>)",
          emerald: "rgb(var(--brand-emerald-rgb) / <alpha-value>)",
        },
      },
      backgroundImage: {
        "app-shell": "var(--app-shell-gradient)",
        "brand-gradient":
          "linear-gradient(135deg, var(--brand-rose) 0%, var(--brand-violet) 52%, var(--brand-cyan) 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgb(240 64 104 / 0.14) 0%, rgb(152 80 208 / 0.16) 52%, rgb(79 144 224 / 0.14) 100%)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "var(--card-shadow)",
        "card-hover": "var(--card-shadow-hover)",
        glow: "0 0 48px -12px rgb(152 80 208 / 0.42)",
        "brand-glow": "0 22px 70px -28px rgb(152 80 208 / 0.58)",
      },
      keyframes: {
        "onboarding-import-indeterminate": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(350%)" },
        },
      },
      animation: {
        "onboarding-import-indeterminate":
          "onboarding-import-indeterminate 1.15s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;

