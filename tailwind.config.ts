import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Base Backgrounds ─────────────────────────── */
        background: "#0F0F0F",
        surface: "#151522",
        "surface-2": "#1C1C2E",
        "surface-3": "#222236",
        border: "rgba(255,255,255,0.07)",

        /* ── Brand Primary (Purple) ───────────────────── */
        primary: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8B5CF6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
          DEFAULT: "#8B5CF6",
        },

        /* ── Brand Secondary (Blue) ───────────────────── */
        secondary: {
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563EB",
          700: "#1d4ed8",
          DEFAULT: "#2563EB",
        },

        /* ── Neon Accent (Green) ──────────────────────── */
        accent: {
          DEFAULT: "#39FF14",
          neon: "#39FF14",
          glow: "#00FF87",
          dim: "#22c55e",
        },

        /* ── Semantic ─────────────────────────────────── */
        danger:  { DEFAULT: "#EF4444", dark: "#7f1d1d" },
        warning: { DEFAULT: "#F59E0B", dark: "#78350f" },
        success: { DEFAULT: "#10B981", dark: "#064e3b" },

        /* ── Gaming Aliases ───────────────────────────── */
        gaming: {
          dark:    "#0F0F0F",
          surface: "#151522",
          border:  "rgba(255,255,255,0.07)",
          purple:  "#8B5CF6",
          blue:    "#2563EB",
          neon:    "#39FF14",
          danger:  "#EF4444",
          success: "#10B981",
        },
      },

      /* ── Typography ───────────────────────────────────── */
      fontFamily: {
        sans:  ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono:  ["var(--font-mono)", "JetBrains Mono", "monospace"],
        gaming: ["var(--font-gaming)", "Rajdhani", "Impact", "sans-serif"],
      },

      /* ── Gradients ────────────────────────────────────── */
      backgroundImage: {
        "hero-radial":   "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(139,92,246,0.4) 0%, rgba(15,15,15,0) 70%)",
        "hero-mesh":     "radial-gradient(at 40% 20%, rgba(139,92,246,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(37,99,235,0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(57,255,20,0.05) 0px, transparent 50%)",
        "glass-gradient":"linear-gradient(135deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.01) 100%)",
        "card-gradient": "linear-gradient(145deg,rgba(28,28,46,0.9) 0%,rgba(21,21,34,0.95) 100%)",
        "neon-gradient": "linear-gradient(90deg,#8B5CF6 0%,#2563EB 50%,#39FF14 100%)",
        "brand-gradient":"linear-gradient(135deg,#8B5CF6 0%,#2563EB 100%)",
        "accent-glow":   "radial-gradient(circle,rgba(57,255,20,0.15) 0%,transparent 70%)",
        "sidebar-gradient":"linear-gradient(180deg,rgba(139,92,246,0.08) 0%,transparent 100%)",
      },

      /* ── Box Shadows / Glow ───────────────────────────── */
      boxShadow: {
        "neon":           "0 0 20px rgba(57,255,20,0.4), 0 0 60px rgba(57,255,20,0.15)",
        "neon-sm":        "0 0 10px rgba(57,255,20,0.3)",
        "purple-glow":    "0 0 30px rgba(139,92,246,0.45), 0 0 80px rgba(139,92,246,0.15)",
        "purple-glow-sm": "0 0 15px rgba(139,92,246,0.3)",
        "blue-glow":      "0 0 30px rgba(37,99,235,0.45)",
        "blue-glow-sm":   "0 0 15px rgba(37,99,235,0.3)",
        "glass":          "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        "card":           "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover":     "0 8px 40px rgba(139,92,246,0.2), 0 4px 16px rgba(0,0,0,0.4)",
        "inner-glow":     "inset 0 1px 0 rgba(255,255,255,0.08)",
      },

      /* ── Keyframes & Animations ───────────────────────── */
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "glow-pulse": {
          "0%,100%": { boxShadow: "0 0 20px rgba(139,92,246,0.3)" },
          "50%":     { boxShadow: "0 0 40px rgba(139,92,246,0.6), 0 0 80px rgba(139,92,246,0.2)" },
        },
        "neon-pulse": {
          "0%,100%": { opacity: "1" },
          "50%":     { opacity: "0.6" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
        "float": {
          "0%,100%": { transform: "translateY(0px)" },
          "50%":     { transform: "translateY(-8px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "count-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in":       "fade-in 0.4s ease-out both",
        "fade-up":       "fade-up 0.5s ease-out both",
        "slide-in-left": "slide-in-left 0.4s ease-out both",
        "scale-in":      "scale-in 0.3s ease-out both",
        "glow-pulse":    "glow-pulse 3s ease-in-out infinite",
        "neon-pulse":    "neon-pulse 2s ease-in-out infinite",
        "shimmer":       "shimmer 2.5s linear infinite",
        "float":         "float 4s ease-in-out infinite",
        "spin-slow":     "spin-slow 8s linear infinite",
        "count-up":      "count-up 0.6s ease-out both",
      },

      /* ── Border Radius ────────────────────────────────── */
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      /* ── Backdrop Blur ────────────────────────────────── */
      backdropBlur: {
        "4xl": "72px",
      },
    },
  },
  plugins: [],
};

export default config;
