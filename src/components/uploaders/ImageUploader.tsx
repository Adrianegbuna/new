import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import styles from '@/styles/ImageUploader.module.css';

interface ImageUploaderProps {
  onUploadSuccess: (url: string, key: string) => void;
  onUploadError?: (error: string) => void;
  uploadEndpoint: string;
  maxSizeMB?: number;
  aspectRatio?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  uploadEndpoint,
  maxSizeMB = 10,
  aspectRatio = '1:1',
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      const msg = 'Only JPEG, PNG, and WebP images allowed';
      setError(msg);
      onUploadError?.(msg);
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      const msg = `File size must be less than ${maxSizeMB}MB`;
      setError(msg);
      onUploadError?.(msg);
      return;
    }

    setError('');

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiClient.post(uploadEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // S3 returns url and key instead of publicId
      onUploadSuccess(response.data.url, response.data.key);
      setError('');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Upload failed';
      setError(msg);
      onUploadError?.(msg);
      setPreview('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.uploader}>
      <label className={styles.uploadLabel}>
        <div className={styles.uploadBox}>
          {preview ? (
            <img src={preview} alt="Preview" className={styles.preview} />
          ) : (
            <>
              <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className={styles.uploadText}>
                {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </p>
              <p className={styles.uploadHint}>PNG, JPG, WebP up to {maxSizeMB}MB</p>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            className={styles.fileInput}
            aria-label="Upload image"
          />
        </div>
      </label>

      {error && <p className={styles.error}>{error}</p>}
      {uploading && <p className={styles.uploading}>Uploading to S3...</p>}
    </div>
  );
};
