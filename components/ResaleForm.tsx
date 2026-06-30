import { useState } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { S3ImageUploader } from './S3ImageUploader';

const PRODUCT_CONDITIONS = ['Like New', 'Good', 'Fair', 'Poor'];
const DELIVERY_OPTIONS = ['pickup', 'delivery', 'both'];
const DELIVERY_LABELS = { pickup: 'Pickup', delivery: 'Delivery', both: 'Both (Pickup & Delivery)' };

export default function ResaleForm() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    productCondition: 'Good',
    price: '',
    quantity: '',
    inspectionFee: '',
    deliveryOption: 'both',
    images: [] as string[],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUploadComplete = (urls: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images: urls.slice(0, 1),
    }));
    setUploadingImages(false);
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('Please log in to submit a resale listing');
      return;
    }

    if (formData.images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/resales', {
        ...formData,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity || '0', 10),
        inspectionFee: parseFloat(formData.inspectionFee),
      });

      setSuccess('Resale listing submitted successfully! Your product is under review.');
      setFormData({
        productName: '',
        description: '',
        productCondition: 'Good',
        price: '',
        quantity: '',
        inspectionFee: '',
        deliveryOption: 'both',
        images: [],
      });

      // Redirect to account/swap tab instead of admin dashboard
      setTimeout(() => {
        router.push('/account?tab=swap');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit resale listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Sell Your Product</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Name *
          </label>
          <input
            type="text"
            name="productName"
            value={formData.productName}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            placeholder="e.g., Solar Panel 400W"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            placeholder="Describe your product condition, features, and accessories included"
          />
        </div>

        {/* Product Condition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Condition *
          </label>
          <select
            name="productCondition"
            value={formData.productCondition}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
          >
            {PRODUCT_CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>

        {/* Asking Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asking Price (₦) *
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            placeholder="e.g., 150000"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity Available *
          </label>
          <input
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
            min="1"
            step="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            placeholder="e.g., 2"
          />
        </div>

        {/* Inspection Fee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Inspection/Verification Fee (₦) *
          </label>
          <input
            type="number"
            name="inspectionFee"
            value={formData.inspectionFee}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            placeholder="e.g., 5000"
          />
        </div>

        {/* Delivery Option */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Option *
          </label>
          <select
            name="deliveryOption"
            value={formData.deliveryOption}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
          >
            {DELIVERY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {DELIVERY_LABELS[option as keyof typeof DELIVERY_LABELS]}
              </option>
            ))}
          </select>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Images (JPG, PNG, WebP) *
          </label>
          <S3ImageUploader
            folder="products"
            maxImages={1}
            onUploadComplete={handleImageUploadComplete}
            onError={(err) => setError(`Image upload failed: ${err.message}`)}
          />
          <p className="text-gray-500 text-sm mt-2">Upload high-quality images showing the product from different angles</p>

          {/* Display Uploaded Images */}
          {formData.images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-900 disabled:bg-gray-400 transition"
        >
          {loading ? 'Submitting...' : 'Submit Resale Listing'}
        </button>
      </form>

      <p className="text-gray-600 text-sm mt-6">
        * Required fields. Your listing will be reviewed by our admin team within 24 hours.
      </p>
    </div>
  );
}
