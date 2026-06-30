import { useState } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import styles from '@/styles/profile.module.css';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/Header';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user?.profilePhotoUrl || '');
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    stateProvince: (user as any)?.stateProvince || '',
    country: user?.country || '',
    zipCode: (user as any)?.zipCode || '',
    bio: (user as any)?.bio || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleProfilePhotoSuccess = (url: string, key: string) => {
    setProfilePhotoUrl(url);
    updateUser({ profilePhotoUrl: url });
    setMessage('Profile photo updated successfully!');
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
      await updateUser({
        ...formData,
        profilePhotoUrl,
      });
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      <Header />
      <div className={styles.profileContainer}>
        <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.includes('successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-2xl">
          {/* Profile Photo Section */}
          <div className={styles.profileSection}>
            <h2>Profile Photo</h2>
            <div className={styles.photoArea}>
              {profilePhotoUrl && (
                <img src={profilePhotoUrl} alt="Profile" className={styles.currentPhoto} />
              )}
              <ImageUploader
                uploadEndpoint="/api/uploads/profile-photo"
                onUploadSuccess={handleProfilePhotoSuccess}
                aspectRatio="1:1"
              />
            </div>
          </div>

          {/* Personal Information Section */}
          <div className={styles.profileSection}>
            <h2>Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={styles.formGroup}>
                <label>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className={styles.profileSection}>
            <h2>Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="opacity-100 text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700"
                />
                <p className="text-xs text-gray-800 dark:text-gray-200 font-bold mt-1">Email cannot be changed</p>
              </div>
              <div className={styles.formGroup}>
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+234..."
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className={styles.profileSection}>
            <h2>Address</h2>
            <div className={styles.formGroup}>
              <label>Street Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className={styles.formGroup}>
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Lagos"
                />
              </div>
              <div className={styles.formGroup}>
                <label>State/Province</label>
                <input
                  type="text"
                  name="stateProvince"
                  value={formData.stateProvince}
                  onChange={handleInputChange}
                  placeholder="Lagos State"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className={styles.formGroup}>
                <label>Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="Nigeria"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Postal Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  placeholder="100001"
                />
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className={styles.profileSection}>
            <h2>Bio</h2>
            <div className={styles.formGroup}>
              <label>About You</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
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
              {loading ? 'Saving...' : 'Save Changes'}
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

