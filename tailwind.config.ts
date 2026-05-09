import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f1b22",
        paper: "#fff9ec",
        paper2: "#fffcf5",
        pastel: {
          pink: "#ffd8e5",
          blue: "#c9e0ff",
          yellow: "#fff2d6",
          mint: "#d5f6e3",
          lilac: "#e6d9ff",
          aqua: "#cbf4f1",
          peach: "#ffe5d4",
        },
      },
      fontFamily: {
        marker: ["var(--font-marker)", "cursive"],
      },
      boxShadow: {
        cut: "6px 8px 0 rgba(31, 27, 34, 0.14)",
        cutLg: "10px 12px 0 rgba(31, 27, 34, 0.12)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
