import React, { useState } from 'react';
import styles from '@/styles/SearchBar.module.css';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
}) => {
  const [query, setQuery] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Prevent leading spaces, allow trailing for user experience
    const sanitizedValue = inputValue.trimStart();
    setQuery(sanitizedValue);

    // Clear previous timer
    if (debounceTimer) clearTimeout(debounceTimer);

    // Debounce search callback
    const timer = setTimeout(() => {
      const trimmedQuery = sanitizedValue.trim();
      onSearch(trimmedQuery.length > 0 ? trimmedQuery : '');
    }, debounceMs);

    setDebounceTimer(timer);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    if (debounceTimer) clearTimeout(debounceTimer);
  };

  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={styles.searchInput}
        aria-label="Search"
      />
      {query && (
        <button
          onClick={handleClear}
          className={styles.clearButton}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
};
