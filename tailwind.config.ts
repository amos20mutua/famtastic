import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"]
      },
      colors: {
        canvas: {
          primary: "#F8FAF8",
          surface: "#FFFFFF",
          muted: "#F1F5F2"
        },
        brand: {
          soft: "#E6EFEA",
          DEFAULT: "#1F3D2B",
          strong: "#162E20"
        },
        ink: {
          primary: "#1A1A1A",
          secondary: "#5C6B63",
          muted: "#8A9790"
        },
        danger: {
          soft: "#FDECEC",
          50: "#FDECEC",
          100: "#F8D7D7",
          200: "#F1B6B6",
          300: "#E88989",
          400: "#D76060",
          500: "#C94A4A",
          600: "#B64242",
          700: "#9C3838",
          800: "#7F2E2E",
          900: "#662626",
          DEFAULT: "#C94A4A"
        },
        warning: {
          soft: "#FFF6E5",
          50: "#FFF6E5",
          100: "#FCEBC2",
          200: "#F7D995",
          300: "#EDBF62",
          400: "#DCA43B",
          500: "#C58A2E",
          600: "#AE7728",
          700: "#936222",
          800: "#774F1C",
          900: "#5E3F17",
          DEFAULT: "#C58A2E"
        },
        success: {
          soft: "#E8F5EC",
          50: "#E8F5EC",
          100: "#D1EBD9",
          200: "#AFD9BC",
          300: "#84C39A",
          400: "#58A874",
          500: "#2F7A4E",
          600: "#286944",
          700: "#215639",
          800: "#1B452F",
          900: "#153626",
          DEFAULT: "#2F7A4E"
        },
        border: "#E3E8E5",
        divider: "#EEF2EF",
        sand: {
          50: "#F8FAF8",
          100: "#F1F5F2",
          200: "#E6EFEA",
          300: "#D7E2DC",
          400: "#BAC7C0",
          500: "#96A59D",
          600: "#6F7E76",
          700: "#55635C",
          800: "#354039",
          900: "#1A1A1A"
        },
        pine: {
          50: "#E6EFEA",
          100: "#D8E7DD",
          200: "#BDD4C6",
          300: "#95B39F",
          400: "#6F8E7D",
          500: "#496755",
          600: "#34513F",
          700: "#284534",
          800: "#1F3D2B",
          900: "#162E20"
        },
        sunrise: {
          50: "#FDECEC",
          100: "#F8D7D7",
          200: "#F1B6B6",
          300: "#E88989",
          400: "#D76060",
          500: "#C94A4A",
          600: "#B64242",
          700: "#9C3838",
          800: "#7F2E2E",
          900: "#662626"
        },
        slatewarm: {
          50: "#EEF2EF",
          100: "#E3E8E5",
          200: "#D4DCD8",
          300: "#BCC7C1",
          400: "#8A9790",
          500: "#73817A",
          600: "#5C6B63",
          700: "#49564F",
          800: "#303934",
          900: "#1A1A1A"
        }
      },
      boxShadow: {
        soft: "0 18px 40px -32px rgba(26, 34, 29, 0.14), 0 8px 18px -14px rgba(26, 34, 29, 0.06)",
        float: "0 24px 48px -30px rgba(31, 61, 43, 0.22), 0 10px 20px -16px rgba(26, 34, 29, 0.08)",
        insetwarm: "inset 0 1px 0 rgba(255, 255, 255, 0.72)"
      },
      backgroundImage: {
        glow:
          "radial-gradient(circle at top left, rgba(230, 239, 234, 0.78), transparent 36%), radial-gradient(circle at top right, rgba(31, 61, 43, 0.05), transparent 30%)"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        pulsewarm: "pulsewarm 2.6s ease-in-out infinite",
        enter: "enter 0.45s ease-out"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        pulsewarm: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(31, 61, 43, 0.12)" },
          "70%": { boxShadow: "0 0 0 14px rgba(31, 61, 43, 0)" }
        },
        enter: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
