import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { User } from '../models/User';
import { Review } from '../models/Review';
import { Like, MoreThan } from 'typeorm';
import { AuthRequest } from '../middleware/auth';
import { uploadToS3 } from '../services/s3Service';
import fs from 'fs';

const productRepository = AppDataSource.getRepository(Product);
const storeRepository = AppDataSource.getRepository(Store);
const userRepository = AppDataSource.getRepository(User);
const reviewRepository = AppDataSource.getRepository(Review);

// Transform product data for API response (no fallbacks - use only uploaded images)
const transformProductData = (product: any, includeStore = false, averageRating?: number) => {
  const transformed = {
    ...product,
    title: product.name,
    image: product.image || undefined,
    images: product.images && product.images.length > 0 ? product.images : undefined,
    ...(averageRating !== undefined && { rating: averageRating })
  };

  // Include store information if requested and available
  if (includeStore && product.store) {
    transformed.store = {
      id: product.store.id,
      name: product.store.name,
      slug: product.store.slug,
      logo: product.store.logo
    };
    transformed.storeSlug = product.store.slug;
    transformed.storeName = product.store.name; // Add storeName for frontend display
    transformed.storeLogo = product.store.logo; // Add storeLogo for frontend display
  }

  return transformed;
};

// Get average rating for a product
export const getProductRating = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const reviews = await reviewRepository.find({
      where: { reviewType: 'product', targetId: productId }
    });

    const averageRating = reviews.length > 0 
      ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2))
      : 0;

    res.json({
      productId,
      averageRating,
      totalReviews: reviews.length,
      reviews: reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        userName: r.userName,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching product rating:', error);
    res.status(500).json({ message: 'Failed to fetch rating' });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { country, category, subcategory } = req.query;

    const queryBuilder = productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.store', 'store')
      .where('product.approvalStatus = :approved', { approved: 'approved' })
      .andWhere('store.isActive = :isActive', { isActive: true })
      .andWhere('COALESCE(product.stock, 0) > 0');

    // Add country filter if provided
    if (country) {
      queryBuilder.andWhere('product.country = :country', { country });
    }

    // Add category filter if provided
    if (category) {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    // Add subcategory filter if provided
    if (subcategory) {
      queryBuilder.andWhere('product.subcategory = :subcategory', { subcategory });
    }

    const products = await queryBuilder.orderBy('product.createdAt', 'DESC').getMany();

    // Transform products to match frontend expected format, including store info
    const transformedProducts = products.map(p => transformProductData(p, true));

    res.json(transformedProducts);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await productRepository.findOne({
      where: { id },
      relations: ['store'],
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Transform product to match frontend expected format
    const transformedProduct = transformProductData(product);

    res.json(transformedProduct);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q, country } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query required' });
    }

    // Sanitize search query to prevent injection
    const sanitizedQuery = String(q).replace(/[<>"']/g, '').trim();
    
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return res.status(400).json({ message: 'Invalid search query' });
    }

    const whereConditions: any[] = [
      { name: Like(`%${sanitizedQuery}%`), approvalStatus: 'approved', stock: MoreThan(0) },
      { description: Like(`%${sanitizedQuery}%`), approvalStatus: 'approved', stock: MoreThan(0) },
      { category: Like(`%${sanitizedQuery}%`), approvalStatus: 'approved', stock: MoreThan(0) },
    ];

    let products;
    if (country) {
      const countryConditions = whereConditions.map(cond => ({ ...cond, country: country as string }));
      products = await productRepository.find({
        where: countryConditions,
        relations: ['store'],
      });
    } else {
      products = await productRepository.find({
        where: whereConditions,
        relations: ['store'],
      });
    }

    // Transform products to match frontend expected format
    const transformedProducts = products.map(p => transformProductData(p));

    res.json(transformedProducts);
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, price, category, subcategory, stock, storeId, country, city, imageUrls: imageUrlsStr } = req.body;
    const userId = req.user?.userId;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // ✅ NEW: Accept imageUrls from frontend S3 direct upload
    let imageUrls: string[] = [];
    let imageUrl: string | undefined = undefined;
    const allImages: string[] = [];
    const allVideos: string[] = [];

    // Check if imageUrls were provided by frontend (S3 direct upload)
    if (imageUrlsStr) {
      try {
        imageUrls = typeof imageUrlsStr === 'string' ? JSON.parse(imageUrlsStr) : imageUrlsStr;
        if (Array.isArray(imageUrls) && imageUrls.length > 0) {
          if (imageUrls.length > 1) {
            return res.status(400).json({ message: 'Only one product image is allowed.' });
          }
          console.log(`[PRODUCT CREATE] ✓ Received ${imageUrls.length} pre-uploaded S3 URLs from frontend:`, {
            urls: imageUrls.map(u => u.substring(0, 80) + '...'),
          });
          allImages.push(imageUrls[0]);
          imageUrl = imageUrls[0];
        }
      } catch (parseErr) {
        console.warn('[PRODUCT CREATE] Could not parse imageUrls:', parseErr);
      }
    }

    // If no S3 URLs provided, fall back to multer file uploads (backwards compatibility)
    if (allImages.length === 0 && files && files.images && files.images.length > 0) {
      console.log(`[PRODUCT CREATE] No S3 URLs provided, falling back to multer files. Uploading ${files.images.length} images to S3`);
      try {
        const file = files.images[0];
        console.log(`[PRODUCT CREATE] Uploading single image: ${file.originalname}`);
        const imageBuffer = fs.readFileSync(file.path);
        const s3Url = await uploadToS3(imageBuffer, file.originalname, 'products');
        allImages.push(s3Url);
        imageUrl = s3Url;
        console.log('[PRODUCT CREATE] Single image uploaded successfully');
      } catch (uploadError: any) {
        console.error('[PRODUCT CREATE] S3 upload error (full):', {
          message: uploadError?.message,
          code: uploadError?.Code,
          statusCode: uploadError?.$metadata?.httpStatusCode,
        });
        // If upload fails, return detailed error for debugging
        return res.status(400).json({ 
          message: 'Image upload failed. Please try again.',
          details: {
            error: uploadError?.message,
            code: uploadError?.Code || 'UNKNOWN',
          }
        });
      }
    }

    // Require at least one image (from either source)
    if (allImages.length === 0) {
      console.error('[PRODUCT CREATE] ❌ No images provided (no S3 URLs and no multer files)');
      return res.status(400).json({ message: 'At least one product image is required.' });
    }

    let finalStoreId = storeId;

    // If no storeId provided, auto-find or create vendor's store
    if (!finalStoreId) {
      let store = await storeRepository.findOne({ where: { ownerId: userId } });
      
      // If vendor doesn't have a store, create one
      if (!store) {
        const user = await userRepository.findOne({ where: { id: userId } });
        const storeName = user?.businessName || `${user?.firstName} ${user?.lastName}'s Store`;
        const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
        
        store = storeRepository.create({
          name: storeName,
          description: `Official store for ${storeName}`,
          ownerId: userId,
          slug,
          country: country || user?.country || 'Nigeria',
          city: city || user?.city || 'Lagos',
          isActive: true,
          isVerified: false,
          verificationStatus: 'pending'
        });
        
        store = await storeRepository.save(store);
      }
      
      finalStoreId = store.id;
    }

    // Verify that the store belongs to the user
    const store = await storeRepository.findOne({ where: { id: finalStoreId } });
    
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Check if user owns this store
    if (store.ownerId !== userId) {
      return res.status(403).json({ message: 'You can only add products to your own store' });
    }

    // Upload videos to AWS S3 (if provided via multer)
    try {
      if (files && files.videos && files.videos.length > 0) {
        const file = files.videos[0];
        const videoBuffer = fs.readFileSync(file.path);
        const s3Url = await uploadToS3(videoBuffer, file.originalname, 'videos');
        allVideos.push(s3Url);
      }
    } catch (videoError: any) {
      console.error('S3 video upload error:', videoError);
      // Videos are optional, so just continue without them
    }

    // Get country and city from request or store
    const finalCountry = country || store.country;
    const finalCity = city || store.city;

    // Generate unique tracking ID
    const trackingId = `PRD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Apply 10% markup to vendor price
    const originalPrice = parseFloat(price);
    const markedUpPrice = originalPrice * 1.10;

    console.log(`[PRODUCT CREATE] Creating product in database:`, {
      name,
      imageCount: allImages.length,
      videoCount: allVideos.length,
      storeId: finalStoreId,
      trackingId,
    });

    const product = productRepository.create({
      name,
      description,
      price: markedUpPrice,
      image: imageUrl,
      images: allImages.length > 0 ? allImages : undefined,
      videos: allVideos.length > 0 ? allVideos : undefined,
      category,
      subcategory: subcategory || null,
      stock: parseInt(stock),
      trackingId,
      storeId: finalStoreId,
      country: finalCountry,
      city: finalCity,
      approvalStatus: 'pending',
    });

    const savedProduct = await productRepository.save(product);
    
    console.log(`[PRODUCT CREATE] ✓ Product saved successfully:`, {
      id: savedProduct.id,
      trackingId,
      images: allImages.length,
      approvalStatus: savedProduct.approvalStatus,
    });
    
    res.status(201).json({ 
      ...savedProduct, 
      message: 'Product created successfully. Awaiting admin approval before it goes live.' 
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const product = await productRepository.findOne({ where: { id }, relations: ['store'] });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user owns this product (admins can edit any product)
    if (product.store && product.store.ownerId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'You can only update your own products' });
    }

    const updates: any = { ...req.body };
    const isAdmin = req.user?.role === 'admin';

    // Vendors must never be able to self-approve/reject from this endpoint.
    if (!isAdmin) {
      delete updates.approvalStatus;
      delete updates.approvedBy;
      delete updates.approvedAt;
      delete updates.isApproved;
    }

    if (updates.stock !== undefined) {
      const parsedStock = Number(updates.stock);
      if (!Number.isFinite(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
        return res.status(400).json({ message: 'Stock must be a non-negative whole number' });
      }
      updates.stock = parsedStock;
      if (parsedStock > 0 && product.approvalStatus === 'rejected') {
        updates.approvalStatus = 'pending';
      }
    }

    if (Array.isArray(updates.images)) {
      if (updates.images.length === 0) {
        return res.status(400).json({ message: 'At least one product image is required.' });
      }
      if (updates.images.length > 1) {
        return res.status(400).json({ message: 'Only one product image is allowed.' });
      }
      updates.images = updates.images.slice(0, 1);
      updates.image = updates.images[0];
    } else if (typeof updates.image === 'string' && updates.image.trim()) {
      updates.images = [updates.image];
    }

    if (Array.isArray(updates.videos)) {
      if (updates.videos.length > 1) {
        return res.status(400).json({ message: 'Only one product video is allowed.' });
      }
      updates.videos = updates.videos.slice(0, 1);
    }

    await productRepository.update(id, updates);
    const updatedProduct = await productRepository.findOne({ where: { id } });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProductPrice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    const userId = req.user?.userId;

    if (!price || isNaN(parseFloat(price))) {
      return res.status(400).json({ message: 'Valid price is required' });
    }

    const product = await productRepository.findOne({ where: { id }, relations: ['store'] });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user owns this product
    if (product.store && product.store.ownerId !== userId) {
      return res.status(403).json({ message: 'You can only update your own products' });
    }

    let newPrice = parseFloat(price);
    if (newPrice <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    // Add 10% to the price
    newPrice = newPrice * 1.10;
    console.log(`💰 Price updated: ${price} + 10% fee = ${newPrice.toFixed(2)}`);

    await productRepository.update(id, { price: newPrice });
    const updatedProduct = await productRepository.findOne({ where: { id } });

    res.json({ ...updatedProduct, message: 'Product price updated successfully' });
  } catch (error) {
    console.error('Update product price error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await productRepository.findOne({ where: { id } });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await productRepository.delete(id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllVendorProducts = async (req: Request, res: Response) => {
  try {
    // Ensure repositories are properly initialized
    if (!AppDataSource.isInitialized) {
      console.error('[PRODUCT] Database not initialized');
      return res.status(503).json({ message: 'Database connection not ready' });
    }

    const { category, subcategory } = req.query;

    // Get fresh repository instance
    const repo = AppDataSource.getRepository(Product);
    
    if (!repo) {
      console.error('[PRODUCT] Product repository not found');
      return res.status(500).json({ message: 'Product repository error' });
    }

    const queryBuilder = repo.createQueryBuilder('product')
      .leftJoinAndSelect('product.store', 'store')
      .where('product.approvalStatus = :approved', { approved: 'approved' })
      .andWhere('(store.id IS NULL OR store.isActive = :isActive)', { isActive: true })
      .andWhere('COALESCE(product.stock, 0) > 0');

    // Add category filter if provided
    if (category) {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    // Add subcategory filter if provided
    if (subcategory) {
      queryBuilder.andWhere('product.subcategory = :subcategory', { subcategory });
    }

    // Get all products from verified vendors
    const products = await queryBuilder.orderBy('product.createdAt', 'DESC').getMany();

    // Transform products to match frontend expected format, including store info
    const transformedProducts = products.map(p => transformProductData(p, true));

    res.json(transformedProducts);
  } catch (error: any) {
    console.error('Get all vendor products error:', {
      message: error.message,
      code: error.code,
      query: error.query,
    });
    res.status(500).json({ 
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

export const getVendorProducts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    // Find vendor's store
    const store = await storeRepository.findOne({ where: { ownerId: userId } });
    
    if (!store) {
      return res.json([]);
    }

    // Get all products from vendor's store
    const products = await productRepository.find({ 
      where: { storeId: store.id },
      relations: ['store'],
      order: { createdAt: 'DESC' }
    });

    // Transform products for API response
    const transformedProducts = products.map(p => transformProductData(p));

    res.json(transformedProducts);
  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

