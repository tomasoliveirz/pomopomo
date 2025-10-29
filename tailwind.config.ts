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
        bg: 'var(--bg)',
        card: 'var(--card)',
        text: 'var(--text)',
        accent: 'var(--accent)',
        'accent-subtle': 'var(--accent-subtle)',
        ring: 'var(--ring)',
        success: 'var(--success)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'cursive'],
      },
      borderRadius: {
        'card': '16px',
      },
    },
  },
  plugins: [],
};

export default config;


