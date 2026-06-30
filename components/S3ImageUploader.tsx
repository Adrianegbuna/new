'use client';

import React, { useState, useRef } from 'react';
import { batchUploadImagesToS3 } from '../lib/s3ImageUploader';

interface S3ImageUploaderProps {
  folder?: 'products' | 'installers' | 'store-logos' | 'admin-products' | 'admin-flash-deals';
  maxImages?: number;
  onUploadComplete: (imageUrls: string[]) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export const S3ImageUploader: React.FC<S3ImageUploaderProps> = ({
  folder = 'products',
  maxImages = 10,
  onUploadComplete,
  onError,
  className = '',
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    let files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    setError(null);

    if (maxImages === 1) {
      files = [files[0]];
    }

    // Validate file count
    if (files.length > maxImages) {
      const errorMsg = `Maximum ${maxImages} images allowed`;
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter((f) => !validTypes.includes(f.type));

    if (invalidFiles.length > 0) {
      const errorMsg = `Invalid file types. Only JPEG, PNG, WebP allowed.`;
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter((f) => f.size > 20 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      const errorMsg = `File(s) too large. Maximum 20MB each.`;
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return;
    }

    setUploading(true);

    try {
      console.log(`[S3ImageUploader] Starting upload of ${files.length} files to ${folder}`);

      const urls = await batchUploadImagesToS3(files, folder, undefined, (progressData) => {
        setProgress((prev) => ({
          ...prev,
          [`${progressData.currentFile}/${progressData.totalFiles}`]: progressData.currentProgress.percentComplete,
        }));
      });

      console.log(`[S3ImageUploader] ✓ Upload complete: ${urls.length} files`);

      setUploadedUrls(urls);
      onUploadComplete(urls);
      setProgress({});
      setError(null);
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[S3ImageUploader] ❌ Upload failed:`, errorMsg);
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`s3-image-uploader ${className}`}>
      <div className="uploader-container">
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxImages > 1}
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: 'none' }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="upload-btn"
        >
          {uploading ? (
            <>
              <span>🔄</span>
              Uploading...
            </>
          ) : (
            <>
              <span>📤</span>
              {maxImages === 1 ? 'Select Image' : 'Select Images'}
            </>
          )}
        </button>

        <p className="help-text">
          Max {maxImages} {maxImages === 1 ? 'image' : 'images'} | JPEG, PNG, WebP | Max 20MB each
        </p>
      </div>

      {error && (
        <div className="error-message" style={{ color: 'red', marginTop: '10px', padding: '10px', background: '#fee', borderRadius: '4px' }}>
          ⚠️ {error}
        </div>
      )}

      {Object.entries(progress).length > 0 && (
        <div className="progress-section" style={{ marginTop: '10px' }}>
          <h4>Uploading...</h4>
          {Object.entries(progress).map(([label, percent]) => (
            <div key={label} style={{ marginBottom: '8px' }}>
              <span>{label}: {percent}%</span>
              <div style={{ background: '#ddd', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    background: '#4CAF50',
                    height: '100%',
                    width: `${percent}%`,
                    transition: 'width 0.2s',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {uploadedUrls.length > 0 && (
        <div className="uploaded-section" style={{ marginTop: '10px' }}>
          <p style={{ color: 'green' }}>✓ {uploadedUrls.length} image(s) uploaded successfully</p>
          <div className="uploaded-urls" style={{ fontSize: '12px', maxHeight: '100px', overflow: 'auto' }}>
            {uploadedUrls.map((url, i) => (
              <div key={i} style={{ margin: '4px 0', wordBreak: 'break-all', color: '#666' }}>
                {url.substring(0, 60)}...
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default S3ImageUploader;
