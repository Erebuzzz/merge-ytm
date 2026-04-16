import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-sm": ["clamp(1.25rem, 2vw, 1.5rem)", { lineHeight: "1.2", fontWeight: "700" }],
        "display-lg": ["clamp(1.75rem, 3vw, 2.5rem)", { lineHeight: "1.15", fontWeight: "800" }],
        "display-xl": ["clamp(2.25rem, 5vw, 4rem)", { lineHeight: "1.05", fontWeight: "900" }],
      },
      colors: {
        background: "#050505",
        surface: {
          elevated: "#0f0f0f",
          highlight: "#181818",
          border: "#252525",
        },
        brand: {
          spotify: "#1DB954",
          ytmusic: "#FF0000",
          ytred: "#FF0000",
          ytgradient1: "#F32C3A",
          ytgradient2: "#F65D3A",
        },
        accent: {
          warm: "#F65D3A",
          cool: "#1DB954",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#A0A0A0",
          muted: "#606060",
        },
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(29, 185, 84, 0.4)",
        "yt-glow": "0 0 50px -15px rgba(243, 44, 58, 0.5)",
        "brand-glow": "0 0 60px -10px rgba(255, 0, 0, 0.3)",
        "card-hover": "0 8px 40px -12px rgba(0, 0, 0, 0.5), 0 0 20px -5px rgba(255, 0, 0, 0.1)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in-right": "slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 2s infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
