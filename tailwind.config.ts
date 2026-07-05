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
        giftora: {
          red: "#d90404",
          soft: "#fff1f1",
          ink: "#111827",
          muted: "#6b7280",
          canvas: "#f3f4f6",
          footer: "#02060d",
          panel: "#0b1220",
        },
      },
      boxShadow: {
        card: "0 8px 24px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
