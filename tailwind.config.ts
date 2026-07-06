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
          soft: "#fdf4f0",
          ink: "#2d2424",
          muted: "#7a6565",
          canvas: "#faf5f3",
          footer: "#1f1418",
          panel: "#2a1c20",
        },
        rosegold: {
          50: "#fdf4f0",
          100: "#fbe8e0",
          200: "#f5cfc2",
          300: "#e8a898",
          400: "#d4887a",
          500: "#b76e79",
          600: "#a25a64",
          700: "#874a53",
          800: "#6e3b44",
          900: "#2d2424",
        },
      },
      boxShadow: {
        card: "0 8px 24px rgba(45, 36, 36, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
