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
        ikonnic: {
          red: "#b76e79",
          soft: "#fffaf8",
          ink: "#1a1a1a",
          muted: "#6b6b6b",
          canvas: "#fffaf8",
          footer: "#1c1517",
          panel: "#261a1e",
        },
        rosegold: {
          50: "#fffaf8",
          100: "#fff5f1",
          200: "#fbeae3",
          300: "#f5d6cb",
          400: "#d4988e",
          500: "#b76e79",
          600: "#a25a64",
          700: "#874a53",
          800: "#5c3038",
          900: "#1a1a1a",
        },
      },
      boxShadow: {
        card: "0 4px 20px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03)",
        soft: "0 2px 12px rgba(183, 110, 121, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
