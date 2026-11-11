import type { Config } from "tailwindcss";

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

// Every palette color the UI uses resolves to a CSS variable, so light/dark
// themes are swapped in globals.css without touching component classes.
const scale = (name: string) =>
  Object.fromEntries(SHADES.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        white: "rgb(var(--white) / <alpha-value>)",
        neutral: scale("neutral"),
        red: scale("red"),
        emerald: scale("emerald"),
        amber: scale("amber"),
      },
    },
  },
  plugins: [],
};

export default config;
