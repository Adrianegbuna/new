import { useState, useMemo } from 'react';
import { services } from '@/data/services';
import { SearchBar } from '@/components/ui/SearchBar';
import styles from '@/styles/services.module.css';

const ServicesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredServices = useMemo(() => {
    if (!searchQuery) return services;
    return services.filter(service =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, services]);

  return (
    <div className={styles.servicesContainer}>
      <h1 className={styles.pageTitle}>Our Services</h1>
      <SearchBar
        placeholder="Search services by name or category..."
        onSearch={setSearchQuery}
      />
      
      <div className={styles.resultsGrid}>
        {filteredServices.length > 0 ? (
          filteredServices.map(service => (
            <div key={service.id} className={styles.serviceCard}>
              <h3 className={styles.serviceTitle}>{service.name}</h3>
              <p className={styles.serviceCategory}>{service.category}</p>
              <p className={styles.serviceDescription}>{service.description}</p>
            </div>
          ))
        ) : searchQuery ? (
          <p className={styles.noResults}>
            No services found matching "{searchQuery}"
          </p>
        ) : (
          <p className={styles.noResults}>Loading services...</p>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;
