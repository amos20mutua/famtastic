export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
                display: ["Fraunces", "ui-serif", "Georgia", "serif"]
            },
            colors: {
                sand: {
                    50: "#fcfaf6",
                    100: "#f6f1e9",
                    200: "#eadfce",
                    300: "#d8c7b2",
                    400: "#c2a78c",
                    500: "#a78567",
                    600: "#85664e",
                    700: "#664e3d",
                    800: "#4d3b2f",
                    900: "#36281f"
                },
                pine: {
                    50: "#eef5f0",
                    100: "#d8e7dc",
                    200: "#b5cfbd",
                    300: "#8cb097",
                    400: "#688e77",
                    500: "#4d725f",
                    600: "#395848",
                    700: "#2d4739",
                    800: "#24392e",
                    900: "#1b2d24"
                },
                sunrise: {
                    50: "#fff6ef",
                    100: "#ffe8d9",
                    200: "#ffd0b3",
                    300: "#f5b085",
                    400: "#ea8d5b",
                    500: "#d96d33",
                    600: "#b95528",
                    700: "#924223",
                    800: "#71351f",
                    900: "#592b1b"
                },
                slatewarm: {
                    50: "#f7f5f2",
                    100: "#ede8e1",
                    200: "#ddd4c8",
                    300: "#c3b5a5",
                    400: "#9d8a78",
                    500: "#796657",
                    600: "#5f4f44",
                    700: "#493d36",
                    800: "#312924",
                    900: "#1f1a17"
                }
            },
            boxShadow: {
                soft: "0 18px 40px -32px rgba(28, 31, 26, 0.18), 0 8px 18px -14px rgba(28, 31, 26, 0.08)",
                float: "0 26px 60px -38px rgba(27, 45, 36, 0.24), 0 10px 18px -16px rgba(27, 45, 36, 0.08)",
                insetwarm: "inset 0 1px 0 rgba(255, 255, 255, 0.72)"
            },
            backgroundImage: {
                glow: "radial-gradient(circle at top left, rgba(234, 223, 206, 0.32), transparent 34%), radial-gradient(circle at top right, rgba(77, 114, 95, 0.06), transparent 28%)"
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
                    "0%, 100%": { boxShadow: "0 0 0 0 rgba(241, 93, 29, 0.12)" },
                    "70%": { boxShadow: "0 0 0 14px rgba(241, 93, 29, 0)" }
                },
                enter: {
                    "0%": { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" }
                }
            }
        }
    },
    plugins: []
};
