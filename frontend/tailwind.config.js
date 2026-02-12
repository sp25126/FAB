/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                obsidian: {
                    DEFAULT: '#050505', // Darker default
                    950: '#0a0a0f',     // Deep Blue-Black
                    925: '#0f0f16',     // Panel Base
                    900: '#15151e',     // Panel Highlight
                    850: '#1a1a24',     // Hover State
                    800: '#252530',     // Border/Separator
                    600: '#3e3e4a',     // Lighter Interaction
                },
                neon: {
                    cyan: '#00f2ea',
                    teal: '#00c7be',
                    purple: '#7d00f2',
                    magenta: '#f20089',
                    amber: '#ffb703',
                    red: '#ff003c',
                },
                glass: {
                    base: 'rgba(255, 255, 255, 0.03)',
                    border: 'rgba(255, 255, 255, 0.08)',
                    highlight: 'rgba(255, 255, 255, 0.15)',
                }
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'monospace'],
                sans: ['"Inter"', 'sans-serif'],
                display: ['"Space Grotesk"', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'enter': 'enter 0.5s ease-out forwards',
                'spin-slow': 'spin 12s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                enter: {
                    '0%': { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'grid-pattern': "linear-gradient(to right, #1f2937 1px, transparent 1px), linear-gradient(to bottom, #1f2937 1px, transparent 1px)",
            },
            boxShadow: {
                'neon-cyan': '0 0 10px rgba(0, 242, 234, 0.5), 0 0 20px rgba(0, 242, 234, 0.3)',
                'neon-purple': '0 0 10px rgba(125, 0, 242, 0.5), 0 0 20px rgba(125, 0, 242, 0.3)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            }
        },
    },
    plugins: [],
}
