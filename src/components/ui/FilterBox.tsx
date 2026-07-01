import React from 'react';
import styles from '@/styles/FilterBox.module.css';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterBoxProps {
  title: string;
  options: FilterOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  type?: 'checkbox' | 'radio';
}

export const FilterBox: React.FC<FilterBoxProps> = ({
  title,
  options,
  selectedIds,
  onChange,
  type = 'checkbox',
}) => {
  const handleChange = (id: string) => {
    if (type === 'radio') {
      onChange([id]);
    } else {
      const newSelected = selectedIds.includes(id)
        ? selectedIds.filter(sid => sid !== id)
        : [...selectedIds, id];
      onChange(newSelected);
    }
  };

  return (
    <div className={styles.filterBox}>
      <h3 className={styles.filterTitle}>{title}</h3>
      <div className={styles.filterOptions}>
        {options.map(option => (
          <label key={option.id} className={styles.filterLabel}>
            <input
              type={type}
              name={title}
              value={option.id}
              checked={selectedIds.includes(option.id)}
              onChange={() => handleChange(option.id)}
              className={styles.filterInput}
              aria-label={option.label}
            />
            <span className={styles.filterLabelText}>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
