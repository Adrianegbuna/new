import { useState } from 'react';
import { useRouter } from 'next/router';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/authStore';
import { S3ImageUploader } from '@/components/uploaders/S3ImageUploader';

const PRODUCT_CONDITIONS = ['Like New', 'Good', 'Fair', 'Poor'];

export default function TradeInForm() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    productName: '',
    interestedInProduct: '',
    productCondition: 'Good',
    estimatedPrice: '',
    quantity: '',
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
      setError('Please log in to submit a trade-in request');
      return;
    }

    if (formData.images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/trade-ins', {
        ...formData,
        estimatedPrice: parseFloat(formData.estimatedPrice),
        quantity: parseInt(formData.quantity || '0', 10),
      });

      setSuccess('Trade-in request submitted successfully! Our team will send you a quote within 24-48 hours.');
      setFormData({
        productName: '',
        interestedInProduct: '',
        productCondition: 'Good',
        estimatedPrice: '',
        quantity: '',
        images: [],
      });

      // Redirect to account/swap tab instead of admin dashboard
      setTimeout(() => {
        router.push('/account?tab=swap&swapSubTab=tradein');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit trade-in request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Trade-In Your Product</h2>
      <p className="text-gray-600 mb-6">
        Have a renewable energy product you want to upgrade? Trade it in and get credit towards a new purchase!
      </p>

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
        {/* Product to Trade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What product are you trading in? *
          </label>
          <input
            type="text"
            name="productName"
            value={formData.productName}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="e.g., Old Solar Panel 200W, Battery Backup System"
          />
        </div>

        {/* Interested In */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What product are you interested in? *
          </label>
          <input
            type="text"
            name="interestedInProduct"
            value={formData.interestedInProduct}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="e.g., Solar Panel 400W, Battery Storage System"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="e.g., 2"
          />
        </div>

        {/* Product Condition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Condition of Product Being Traded *
          </label>
          <select
            name="productCondition"
            value={formData.productCondition}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            {PRODUCT_CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>

        {/* Estimated Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Value of Your Product (₦) *
          </label>
          <input
            type="number"
            name="estimatedPrice"
            value={formData.estimatedPrice}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            placeholder="e.g., 80000"
          />
          <p className="text-gray-500 text-sm mt-2">
            Our team will verify and provide you with a competitive quote
          </p>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Images of Your Product (JPG, PNG, WebP) *
          </label>
          <S3ImageUploader
            folder="products"
            maxImages={1}
            onUploadComplete={handleImageUploadComplete}
            onError={(err) => setError(`Image upload failed: ${err.message}`)}
          />
          <p className="text-gray-500 text-sm mt-2">
            Upload clear images showing the product condition, serial number, and any damage
          </p>

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
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? 'Submitting...' : 'Submit Trade-In Request'}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-2">How It Works</h3>
        <ol className="text-blue-800 text-sm space-y-2">
          <li>1. Submit your trade-in request with photos</li>
          <li>2. Our team evaluates and sends you a quote (24-48 hours)</li>
          <li>3. Accept the quote to proceed (optional negotiation)</li>
          <li>4. We arrange pickup and finalize the trade</li>
          <li>5. Get credit towards your new purchase!</li>
        </ol>
      </div>

      <p className="text-gray-600 text-sm mt-6">
        * Required fields. Your estimated value is subject to verification and inspection.
      </p>
    </div>
  );
}


