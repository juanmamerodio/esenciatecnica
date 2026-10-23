// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#f7f7f5",
        surface: "#ffffff",
        glass: "rgba(255, 255, 255, 0.62)",
        accent: {
          DEFAULT: "#3d8c6e",
          lt: "#e8f3ef",
        },
        text: "#1c1c1e",
        gray: {
          DEFAULT: "#6b7280",
          lt: "#f0f0ee",
        },
        muted: "#8e8e93",
        border: "rgba(0, 0, 0, 0.08)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        'soft': '0 2px 12px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;