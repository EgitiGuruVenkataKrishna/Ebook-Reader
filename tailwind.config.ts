import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171412",
        paper: "#f7f4ee",
        porcelain: "#fffdf8",
        graphite: "#2f302d",
        line: "#ded8cb",
        saffron: "#d88b21",
        fern: "#3f6e52",
        oxblood: "#763b36",
        steel: "#38566c"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(47, 48, 45, 0.10)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
