/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./src/components/**/*.{js,ts,jsx,tsx}",
        "./src/components/views/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                helmet: {
                    primary: '#FF6B35',
                    secondary: '#F7931E',
                    background: '#000000',
                    text: '#FFFFFF',
                    danger: '#FF3B30',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
