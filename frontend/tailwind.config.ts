import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "#080808", // deep dark base
        surface: {
          elevated: "#121212",
          highlight: "#1a1a1a",
          border: "#282828",
        },
        brand: {
          spotify: "#1DB954",
          ytmusic: "#FF0000",
          ytgradient1: "#F32C3A",
          ytgradient2: "#F65D3A",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#B3B3B3",
          muted: "#757575",
        }
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(29, 185, 84, 0.4)",
        "yt-glow": "0 0 50px -15px rgba(243, 44, 58, 0.5)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in-right": "slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        }
      }
    },
  },
  plugins: [],
};

export default config;
