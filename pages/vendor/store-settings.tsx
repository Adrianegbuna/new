import { useState } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import styles from '@/styles/store-settings.module.css';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';
import { getApiBaseUrl } from '@/lib/apiConfig';

export default function StoreSettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [logoUrl, setLogoUrl] = useState(user?.logoUrl || '');
  const [formData, setFormData] = useState({
    storeName: user?.firstName || '',
    storeDescription: '',
    businessRegistration: '',
    taxId: '',
    bankAccountName: user?.bankAccountName || '',
    bankAccountNumber: user?.bankAccountNumber || '',
    bankName: user?.bankName || '',
    bankCode: user?.bankCode || '',
    operatingHours: 'Mon-Fri: 8AM-6PM, Sat: 9AM-4PM',
    storePolicy: '',
    returnPolicy: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogoSuccess = (url: string, key: string) => {
    setLogoUrl(url);
    setMessage('Store logo updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${apiBase}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          logoUrl,
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update local auth store
        updateUser({
          ...formData,
          logoUrl,
        });
        setMessage('✓ Store settings updated successfully!');
        setTimeout(() => setMessage(''), 5000);
      } else {
        const error = await response.json();
        setMessage(`Failed to update store settings: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating store settings:', error);
      setMessage('Failed to update store settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'vendor' && user.accountType !== 'ev_vendor')) return null;

  return (
    <div>
      <Header />
      <div className={styles.settingsContainer}>
        <h1 className="text-3xl font-bold mb-8">Store Settings</h1>

        {message && (
          <div className={`mb-6 p-4 rounded-lg font-semibold text-lg border-l-4 ${message.includes('successfully') ? 'bg-green-50 text-green-800 border-green-500' : 'bg-red-50 text-red-800 border-red-500'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-4xl">
          {/* Store Logo Section */}
          <div className={styles.settingsSection}>
            <h2>Store Logo</h2>
            <div className={styles.logoArea}>
              {logoUrl && (
                <img src={logoUrl} alt="Store Logo" className={styles.currentLogo} />
              )}
              <ImageUploader
                uploadEndpoint="/api/uploads/store-logo"
                onUploadSuccess={handleLogoSuccess}
                aspectRatio="4:3"
              />
            </div>
          </div>

          {/* Basic Store Information */}
          <div className={styles.settingsSection}>
            <h2>Basic Store Information</h2>
            <div className={styles.formGroup}>
              <label>Store Name *</label>
              <input
                type="text"
                name="storeName"
                value={formData.storeName}
                onChange={handleInputChange}
                required
                placeholder="Your Store Name"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Store Description</label>
              <textarea
                name="storeDescription"
                value={formData.storeDescription}
                onChange={handleInputChange}
                placeholder="Describe your store, products, and specialties..."
                rows={4}
              />
            </div>
          </div>

          {/* Business Information */}
          <div className={styles.settingsSection}>
            <h2>Business Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={styles.formGroup}>
                <label>Business Registration Number</label>
                <input
                  type="text"
                  name="businessRegistration"
                  value={formData.businessRegistration}
                  onChange={handleInputChange}
                  placeholder="CAC registration number"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Tax ID/TIN</label>
                <input
                  type="text"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleInputChange}
                  placeholder="Tax Identification Number"
                />
              </div>
            </div>
          </div>

          {/* Bank Account Details */}
          <div className={styles.settingsSection}>
            <h2>Bank Account Details</h2>
            <div className={styles.formGroup}>
              <label>Account Holder Name *</label>
              <input
                type="text"
                name="bankAccountName"
                value={formData.bankAccountName}
                onChange={handleInputChange}
                required
                placeholder="Account owner name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={styles.formGroup}>
                <label>Bank Name *</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Zenith Bank, First Bank"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Bank Code</label>
                <input
                  type="text"
                  name="bankCode"
                  value={formData.bankCode}
                  onChange={handleInputChange}
                  placeholder="3-digit bank code"
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Account Number *</label>
              <input
                type="text"
                name="bankAccountNumber"
                value={formData.bankAccountNumber}
                onChange={handleInputChange}
                required
                placeholder="10-digit account number"
              />
            </div>
          </div>

          {/* Operating Details */}
          <div className={styles.settingsSection}>
            <h2>Operating Details</h2>
            <div className={styles.formGroup}>
              <label>Operating Hours</label>
              <input
                type="text"
                name="operatingHours"
                value={formData.operatingHours}
                onChange={handleInputChange}
                placeholder="Mon-Fri: 8AM-6PM, Sat: 9AM-4PM"
              />
            </div>
          </div>

          {/* Policies */}
          <div className={styles.settingsSection}>
            <h2>Store Policies</h2>
            <div className={styles.formGroup}>
              <label>Store Policy</label>
              <textarea
                name="storePolicy"
                value={formData.storePolicy}
                onChange={handleInputChange}
                placeholder="Your store policies, terms of service, etc."
                rows={4}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Return & Refund Policy</label>
              <textarea
                name="returnPolicy"
                value={formData.returnPolicy}
                onChange={handleInputChange}
                placeholder="Your return and refund policies..."
                rows={4}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              type="submit"
              disabled={loading}
              className={styles.saveButton}
            >
              {loading ? 'Saving...' : 'Save Store Settings'}
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

