import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theme colors will be CSS variables
        bg: 'rgb(var(--bg) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-subtle': 'rgb(var(--accent) / 0.25)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '32px',
        'pill': '9999px',
      },
    },
  },
  plugins: [],
};

export default config;


