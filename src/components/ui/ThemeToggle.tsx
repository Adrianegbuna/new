import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="w-10 h-10" /> // Placeholder to prevent layout shift
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        // Sun icon for dark mode
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l-2.828-2.829a1 1 0 00-1.414 1.414l2.828 2.829a1 1 0 001.414-1.414zM2.05 6.464A1 1 0 003.464 5.05l2.829 2.828a1 1 0 01-1.414 1.414L2.05 6.464zm1.414 8.486l-2.829 2.829a1 1 0 001.414 1.414l2.829-2.829a1 1 0 00-1.414-1.414zM13.586 13.586a1 1 0 001.414 1.414l2.829-2.829a1 1 0 00-1.414-1.414l-2.829 2.829zM5.657 5.657a1 1 0 000-1.414L2.828 1.414a1 1 0 00-1.414 1.414l2.829 2.829a1 1 0 001.414 0zm8.485-8.485a1 1 0 000 1.414l2.829 2.829a1 1 0 101.414-1.414l-2.829-2.829a1 1 0 00-1.414 0zM10 18a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM2 10a1 1 0 011 1h2a1 1 0 110-2H3a1 1 0 01-1 1zm15 0a1 1 0 011 1h2a1 1 0 110-2h-2a1 1 0 01-1 1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        // Moon icon for light mode
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  )
}
