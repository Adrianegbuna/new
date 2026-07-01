import React, { useState, useMemo } from 'react';
import { SearchBar } from '@/components/ui/SearchBar';
import styles from '@/styles/authorized-dealers.module.css';

const dealersData = [
  { id: 1, name: 'Dealer A', location: 'Location A', city: 'City A', phone: '123-456-7890' },
  { id: 2, name: 'Dealer B', location: 'Location B', city: 'City B', phone: '234-567-8901' },
  { id: 3, name: 'Dealer C', location: 'Location C', city: 'City C', phone: '345-678-9012' },
];

export default function AuthorizedDealers() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDealers = useMemo(() => {
    if (!searchQuery) return dealersData;
    return dealersData.filter(dealer =>
      dealer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dealer.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dealer.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dealer.phone.includes(searchQuery)
    );
  }, [searchQuery]);

  return (
    <div className={styles.dealersContainer}>
      <h1 className={styles.pageTitle}>Authorized Dealers</h1>
      <SearchBar
        placeholder="Search by dealer name, location, or city..."
        onSearch={setSearchQuery}
      />
      
      <div className={styles.dealersList}>
        {filteredDealers.length > 0 ? (
          filteredDealers.map(dealer => (
            <div key={dealer.id} className={styles.dealerCard}>
              <h3 className={styles.dealerName}>{dealer.name}</h3>
              <p className={styles.dealerLocation}>{dealer.location}</p>
              <p className={styles.dealerPhone}>{dealer.phone}</p>
            </div>
          ))
        ) : searchQuery ? (
          <p className={styles.noResults}>
            No dealers found matching "{searchQuery}"
          </p>
        ) : (
          <p className={styles.noResults}>Loading dealers...</p>
        )}
      </div>
    </div>
  );
}
