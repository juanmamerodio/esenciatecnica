import type { Config } from "tailwindcss";

/**
 * El tema **no** declara valores: los referencia desde `src/app/globals.css`,
 * que es la única fuente de la identidad (issue #3, spec §3.1).
 * Los colores se exponen como canales RGB para conservar los modificadores de
 * opacidad de Tailwind (`bg-accent/10`, `border-accent/20`).
 */
const canal = (variable: string): string => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: canal("--color-bg"),
        surface: canal("--color-surface"),
        glass: "var(--color-glass)",
        navbar: "var(--color-navbar)",
        accent: {
          DEFAULT: canal("--color-accent"),
          lt: canal("--color-accent-lt"),
        },
        text: canal("--color-text"),
        gray: {
          DEFAULT: canal("--color-gray"),
          lt: canal("--color-gray-lt"),
        },
        muted: canal("--color-muted"),
        border: {
          DEFAULT: "var(--color-line)",
          soft: "var(--color-line-soft)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        card: "var(--radio-card)",
        pill: "var(--radio-control)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
      },
    },
  },
  plugins: [],
};

export default config;
