import { useState } from 'react';
import { FilterBox } from '@/components/ui/FilterBox';
import styles from '@/styles/dealers.module.css';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export default function DealersPage() {
  const [selectedState, setSelectedState] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string[]>([]);

  const stateOptions: FilterOption[] = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'].map(state => ({
    id: state.toLowerCase().replace(/\s+/g, '-'),
    label: state,
  }));
  
  const typeOptions: FilterOption[] = ['Car Dealers', 'Motorcycle Dealers', 'Truck Dealers', 'Auto Parts', 'Used Cars', 'New Cars', 'Service Centers', 'Tire Shops', 'Auto Repair', 'Insurance Agents'].map(type => ({
    id: type.toLowerCase().replace(/\s+/g, '-'),
    label: type,
  }));

  return (
    <div className={styles.dealersContainer}>
      <h1 className={styles.pageTitle}>Authorized Dealers</h1>

      <div className={styles.layout}>
        <aside className={styles.filtersSidebar}>
          <h2 className={styles.filtersTitle}>Filters</h2>
          
          <FilterBox
            title="State"
            options={stateOptions}
            selectedIds={selectedState}
            onChange={setSelectedState}
          />

          <FilterBox
            title="Dealer Type"
            options={typeOptions}
            selectedIds={selectedType}
            onChange={setSelectedType}
          />
        </aside>

        <div className={styles.dealersGrid}>
          {/* ...existing dealer cards... */}
        </div>
      </div>
    </div>
  );
}
