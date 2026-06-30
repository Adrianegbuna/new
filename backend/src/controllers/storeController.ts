import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { AuthRequest } from '../middleware/auth';
import { s3Service } from '../services/s3Service';
import fs from 'fs';

const storeRepository = AppDataSource.getRepository(Store);
const productRepository = AppDataSource.getRepository(Product);

export const getAllStores = async (req: AuthRequest, res: Response) => {
  try {
    const { country, category, search } = req.query;

    const queryBuilder = storeRepository.createQueryBuilder('store')
      .leftJoinAndSelect('store.owner', 'owner')
      .where('store.isActive = :isActive', { isActive: true })
      // Public visibility: only admin-approved stores should be listed.
      .andWhere(`(
        store.verificationStatus = :approved
        OR owner.verificationStatus = :approved
        OR owner.role = :adminRole
      )`, { approved: 'approved', adminRole: 'admin' });

    if (country) {
      queryBuilder.andWhere('store.country = :country', { country });
    }

    if (category) {
      queryBuilder.andWhere(':category = ANY(store.categories)', { category });
    }

    if (search) {
      queryBuilder.andWhere('(store.name ILIKE :search OR store.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const stores = await queryBuilder.getMany();

    // Transform stores with proper serialization
    const transformedStores = await Promise.all(
      stores.map(async (store) => {
        const productCount = await productRepository.count({
          where: { storeId: store.id }
        });
        
        // Explicitly convert to plain object for proper JSON serialization
        return {
          id: store.id,
          name: store.name,
          slug: store.slug,
          description: store.description,
          logo: store.logo,
          logoUrl: store.logoUrl,
          logoKey: store.logoKey,
          banner: store.banner,
          phone: store.phone,
          email: store.email,
          address: store.address,
          city: store.city,
          state: store.state,
          country: store.country,
          categories: store.categories,
          isActive: store.isActive,
          isVerified: store.isVerified,
          verificationStatus: store.verificationStatus,
          rating: Number(store.rating),
          totalReviews: store.totalReviews,
          totalSales: store.totalSales,
          totalRevenue: Number(store.totalRevenue),
          totalProducts: productCount,
          owner: store.owner ? {
            id: store.owner.id,
            firstName: store.owner.firstName,
            lastName: store.owner.lastName,
            email: store.owner.email,
            isVerified: store.owner.isVerified === true
          } : null
        };
      })
    );

    console.log(`📦 Returning ${transformedStores.length} stores with product counts`);
    res.json(transformedStores);
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStoreById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const store = await storeRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const visibleProducts = await productRepository.find({
      where: [
        { storeId: store.id, approvalStatus: 'approved' },
        { storeId: store.id, approvalStatus: 'pending' }
      ],
      order: { createdAt: 'DESC' }
    });

    // Explicitly convert to plain object for proper JSON serialization
    const storeData = {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      logo: store.logo,
      logoUrl: store.logoUrl,
      logoKey: store.logoKey,
      banner: store.banner,
      phone: store.phone,
      email: store.email,
      address: store.address,
      city: store.city,
      state: store.state,
      country: store.country,
      categories: store.categories,
      isActive: store.isActive,
      isVerified: store.isVerified,
      verificationStatus: store.verificationStatus,
      rating: Number(store.rating),
      totalReviews: store.totalReviews,
      totalSales: store.totalSales,
      totalRevenue: Number(store.totalRevenue),
      owner: store.owner ? {
        id: store.owner.id,
        firstName: store.owner.firstName,
        lastName: store.owner.lastName,
        email: store.owner.email,
        isVerified: store.owner.isVerified === true
      } : null,
      products: visibleProducts.filter((p) => Number(p.stock || 0) > 0).map(p => {
        try {
          return {
            id: p.id,
            name: p.name,
            title: p.name,
            description: p.description,
            price: Number(p.price),
            image: p.image || null,
            images: Array.isArray(p.images) ? p.images : null,
            subcategory: p.subcategory || null,
            stock: Number(p.stock) || 0,
            approvalStatus: p.approvalStatus,
            storeId: p.storeId
          };
        } catch (mapError) {
          console.error(`Error mapping product ${p.id}:`, mapError);
          return {
            id: p.id,
            name: p.name,
            title: p.name,
            price: 0,
            image: null,
            images: null,
            category: null,
            stock: 0,
            approvalStatus: p.approvalStatus,
            storeId: p.storeId
          };
        }
      })
    };

    res.json(storeData);
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStoreBySlug = async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    // Decode URL-encoded slug
    const decodedSlug = decodeURIComponent(slug);
    console.log(`🔍 Fetching store with slug: ${decodedSlug} (raw: ${slug})`);
    
    const store = await storeRepository.findOne({
      where: { slug: decodedSlug },
      relations: ['owner'],
    });

    if (!store) {
      console.log(`❌ Store not found with slug: ${slug}`);
      return res.status(404).json({ message: 'Store not found' });
    }

    console.log(`✅ Store found: ${store.name} (ID: ${store.id}, OwnerId: ${store.ownerId})`);

    // Fetch approved and pending products for the vendor's store
    const allProducts = await productRepository.find({
      where: [
        { storeId: store.id, approvalStatus: 'approved' },
        { storeId: store.id, approvalStatus: 'pending' }
      ],
      relations: ['store'],
      order: { createdAt: 'DESC' }
    });
    const visibleProducts = allProducts.filter((p) => Number(p.stock || 0) > 0);

    console.log(`📦 Found ${allProducts.length} products for store "${store.name}" (storeId: ${store.id})`);
    
    if (allProducts.length === 0) {
      console.log(`⚠️ No products found for storeId: ${store.id}`);
      // Check if there are ANY products with this store
      const allProductsInStore = await productRepository.find({
        where: { storeId: store.id },
      });
      console.log(`   Total products in store (all statuses): ${allProductsInStore.length}`);
      allProductsInStore.slice(0, 3).forEach(p => {
        console.log(`   - ${p.name} (status: ${p.approvalStatus})`);
      });
    } else {
      allProducts.slice(0, 3).forEach(p => {
        console.log(`   ✓ ${p.name} (${p.approvalStatus})`);
      });
    }

    // Explicitly convert to plain object to ensure proper JSON serialization
    const storeData = {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      logo: store.logo,
      logoUrl: store.logoUrl,
      logoKey: store.logoKey,
      banner: store.banner,
      phone: store.phone,
      email: store.email,
      address: store.address,
      city: store.city,
      state: store.state,
      country: store.country,
      categories: store.categories,
      isActive: store.isActive,
      isVerified: store.isVerified,
      verificationStatus: store.verificationStatus,
      rating: Number(store.rating),
      totalReviews: store.totalReviews,
      totalSales: store.totalSales,
      totalRevenue: Number(store.totalRevenue),
      owner: store.owner ? {
        id: store.owner.id,
        firstName: store.owner.firstName,
        lastName: store.owner.lastName,
        email: store.owner.email,
        isVerified: store.owner.isVerified === true
      } : null,
      products: visibleProducts.map(p => {
        try {
          return {
            id: p.id,
            name: p.name,
            title: p.name,
            description: p.description,
            price: Number(p.price),
            image: p.image || null,
            images: Array.isArray(p.images) ? p.images : null,
            videos: Array.isArray(p.videos) ? p.videos : null,
            subcategory: p.subcategory || null,
            stock: Number(p.stock) || 0,
            approvalStatus: p.approvalStatus,
            storeId: p.storeId
          };
        } catch (mapError) {
          console.error(`Error mapping product ${p.id}:`, mapError);
          return {
            id: p.id,
            name: p.name,
            title: p.name,
            price: 0,
            image: null,
            images: null,
            category: null,
            stock: 0,
            approvalStatus: p.approvalStatus,
            storeId: p.storeId
          };
        }
      })
    };

    console.log(`📤 Returning store response with ${storeData.products.length} products`);
    res.json(storeData);
  } catch (error) {
    console.error('Get store error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyStore = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const store = await storeRepository.findOne({
      where: { ownerId: userId },
      relations: ['products'],
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    res.json(store);
  } catch (error) {
    console.error('Get my store error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createStore = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    // Check if user already has a store
    const existingStore = await storeRepository.findOne({ where: { ownerId: userId } });
    if (existingStore) {
      return res.status(409).json({ message: 'User already has a store' });
    }

    // Generate unique slug
    const baseSlug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let slug = baseSlug;
    let counter = 1;
    while (await storeRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const store = storeRepository.create({
      ...req.body,
      slug,
      ownerId: userId,
    });

    const savedStore = await storeRepository.save(store);
    res.status(201).json(savedStore);
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateStore = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const store = await storeRepository.findOne({ where: { id } });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    if (store.ownerId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Validate phone number if provided
    if (req.body.phone) {
      const { validatePhoneNumber } = require('../utils/phoneValidation');
      const phoneValidation = validatePhoneNumber(req.body.phone, req.body.country || store.country);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ message: phoneValidation.error || 'Invalid phone number' });
      }
    }

    // Validate email if provided
    if (req.body.email) {
      const { validateEmail } = require('../utils/emailValidation');
      const emailValidation = validateEmail(req.body.email);
      if (!emailValidation.isValid) {
        return res.status(400).json({ message: emailValidation.error || 'Invalid email address' });
      }
    }

    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData: any = { ...req.body };

    // Upload logo to S3 if provided
    if (files?.logo && files.logo.length > 0) {
      try {
        const logoFile = files.logo[0];
        const logoBuffer = logoFile.buffer || fs.readFileSync(logoFile.path);
        const result = await s3Service.uploadImage(
          logoBuffer,
          `stores/${id}`,
          logoFile.originalname,
          { contentType: logoFile.mimetype }
        );
        updateData.logoUrl = result.url;
        updateData.logoKey = result.key;
      } catch (uploadError) {
        console.error('Logo upload to S3 failed:', uploadError);
        return res.status(500).json({ message: 'Failed to upload logo' });
      }
    }

    // Upload banner to S3 if provided
    if (files?.banner && files.banner.length > 0) {
      try {
        const bannerFile = files.banner[0];
        const bannerBuffer = bannerFile.buffer || fs.readFileSync(bannerFile.path);
        const result = await s3Service.uploadImage(
          bannerBuffer,
          `stores/${id}/banner`,
          bannerFile.originalname,
          { contentType: bannerFile.mimetype }
        );
        updateData.bannerUrl = result.url;
        updateData.bannerKey = result.key;
      } catch (uploadError) {
        console.error('Banner upload to S3 failed:', uploadError);
        return res.status(500).json({ message: 'Failed to upload banner' });
      }
    }

    await storeRepository.update(id, updateData);
    const updatedStore = await storeRepository.findOne({ where: { id } });

    res.json(updatedStore);
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeStoreImage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { imageType } = req.body; // 'logo' or 'banner'
    const userId = req.user?.userId;

    const store = await storeRepository.findOne({ where: { id } });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    if (store.ownerId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (imageType !== 'logo' && imageType !== 'banner') {
      return res.status(400).json({ message: 'Invalid image type. Must be "logo" or "banner"' });
    }

    // Update the store to remove the image
    const updateData: any = {};
    updateData[imageType] = null;

    await storeRepository.update(id, updateData);
    const updatedStore = await storeRepository.findOne({ where: { id } });

    res.json({ message: `${imageType} removed successfully`, store: updatedStore });
  } catch (error) {
    console.error('Remove store image error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteStore = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const store = await storeRepository.findOne({ where: { id } });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    if (store.ownerId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await storeRepository.delete(id);
    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const incrementStoreViews = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const store = await storeRepository.findOne({ where: { id } });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Increment the views count
    await storeRepository.increment({ id }, 'views', 1);

    const updatedStore = await storeRepository.findOne({ where: { id } });
    res.json({ message: 'Store views incremented', views: updatedStore?.views });
  } catch (error) {
    console.error('Increment store views error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStoreViews = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const store = await storeRepository.findOne({ where: { id } });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    res.json({ id: store.id, views: store.views });
  } catch (error) {
    console.error('Get store views error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
