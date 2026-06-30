import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Package } from '../models/Package';
import { Store } from '../models/Store';
import { AuthRequest } from '../middleware/auth';

const packageRepository = AppDataSource.getRepository(Package);
const storeRepository = AppDataSource.getRepository(Store);

// Get all packages (public - template list and vendor posted packages)
export const getAllPackages = async (req: Request, res: Response) => {
  try {
    const { category, featured, isActive, vendorPosted, storeId } = req.query;

    let where: any = { isActive: true };
    
    if (category) where.category = category;
    if (featured === 'true') where.featured = true;
    if (vendorPosted === 'true') where.vendorId = (() => ({ $ne: null }))();
    if (storeId) where.storeId = storeId;

    console.log('[GET PACKAGES] Query params:', { category, featured, isActive, vendorPosted, storeId });
    console.log('[GET PACKAGES] WHERE clause:', where);

    let packages = await packageRepository.find({
      where: Object.keys(where).length > 0 ? where : { isActive: true },
      relations: ['store'],
      order: { featured: 'DESC', createdAt: 'DESC' }
    });

    console.log('[GET PACKAGES] Found packages count:', packages.length);
    console.log('[GET PACKAGES] Packages:', packages.map(p => ({ id: p.id, name: p.name, featured: p.featured, vendorPrice: p.vendorPrice })));

    // If featured=true, only return packages with vendorPrice (actual posted flash deals)
    // and with quantity > 0 (in stock)
    if (featured === 'true') {
      console.log('[GET PACKAGES] Filtering for featured deals with vendorPrice > 0 and quantity > 0');
      packages = packages.filter(pkg => pkg.vendorPrice && pkg.vendorPrice > 0 && pkg.quantity > 0);
      console.log('[GET PACKAGES] After filtering:', packages.length, 'packages');
    }

    res.json(packages);
  } catch (error) {
    console.error('[GET PACKAGES] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
};

// Get package by ID
export const getPackageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const pkg = await packageRepository.findOne({
      where: { id },
      relations: ['store']
    });

    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    res.json(pkg);
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create package (admin only - for creating new templates)
export const createPackage = async (req: AuthRequest, res: Response) => {
  try {
    const { name, panelRange, maxBatteryLithium, maxBatteryTubular, inverterType, category, featured, isActive } = req.body;

    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create packages' });
    }

    // Validate required fields
    if (!name || maxBatteryLithium === undefined || maxBatteryTubular === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newPackage = packageRepository.create({
      name,
      panelRange: panelRange || undefined,
      maxBatteryLithium,
      maxBatteryTubular,
      inverterType: inverterType || 'standard',
      category: category || undefined,
      featured: featured || false,
      isActive: isActive !== false
    });

    const savedPackage = await packageRepository.save(newPackage);
    res.status(201).json(savedPackage);
  } catch (error: any) {
    console.error('Create package error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Vendor posts a package (vendor can offer predefined or custom packages)
export const vendorPostPackage = async (req: AuthRequest, res: Response) => {
  try {
    const { name, panelRange, maxBatteryLithium, maxBatteryTubular, inverterType, vendorPrice, category } = req.body;
    const vendorId = req.user?.userId;

    if (!vendorId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Only vendors can post packages
    if (req.user?.role !== 'vendor') {
      return res.status(403).json({ message: 'Only vendors can post packages' });
    }

    // Validate required fields
    if (!name || maxBatteryLithium === undefined || maxBatteryTubular === undefined || !vendorPrice) {
      return res.status(400).json({ message: 'Missing required fields: name, battery quantities, price' });
    }

    // Create vendor package posting
    const newPackage = packageRepository.create({
      name,
      panelRange: panelRange || 'custom',
      maxBatteryLithium,
      maxBatteryTubular,
      inverterType: inverterType || 'standard',
      vendorId,
      vendorPrice: parseFloat(String(vendorPrice)),
      category: category || 'custom',
      installationKit: true,
      powers: '3 bedrooms, lights, fan, TV, decoder, phone charging',
      warranty: 'Panels (10–25 yrs) • Inverter (1–2 yrs) • Battery — Lithium (3–5 yrs) / Tubular (1–2 yrs) • Installation kit (1 yr)',
      isActive: true
    });

    const savedPackage = await packageRepository.save(newPackage);
    res.status(201).json(savedPackage);
  } catch (error: any) {
    console.error('Vendor post package error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Update package (admin only)
export const updatePackage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, panelRange, maxBatteryLithium, maxBatteryTubular, inverterType, category, featured, isActive } = req.body;

    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update packages' });
    }

    const pkg = await packageRepository.findOne({ where: { id } });
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    if (name) pkg.name = name;
    if (panelRange !== undefined) pkg.panelRange = panelRange;
    if (maxBatteryLithium !== undefined) pkg.maxBatteryLithium = maxBatteryLithium;
    if (maxBatteryTubular !== undefined) pkg.maxBatteryTubular = maxBatteryTubular;
    if (inverterType) pkg.inverterType = inverterType;
    if (category !== undefined) pkg.category = category;
    if (featured !== undefined) pkg.featured = featured;
    if (isActive !== undefined) pkg.isActive = isActive;

    const updatedPackage = await packageRepository.save(pkg);
    res.json(updatedPackage);
  } catch (error: any) {
    console.error('Update package error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Delete package (soft delete - mark as inactive)
export const deletePackage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete packages' });
    }

    const pkg = await packageRepository.findOne({ where: { id } });
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Soft delete by marking as inactive
    pkg.isActive = false;
    await packageRepository.save(pkg);

    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all packages for a store
export const getStorePackages = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;

    const packages = await packageRepository.find({
      where: { storeId, isActive: true },
      order: { createdAt: 'DESC' }
    });

    res.json(packages);
  } catch (error) {
    console.error('Get store packages error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Link a package to a store (admin only)
export const linkPackageToStore = async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, packageId } = req.params;

    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can link packages to stores' });
    }

    const pkg = await packageRepository.findOne({ where: { id: packageId } });
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Link the package to the store
    pkg.storeId = storeId;
    const updated = await packageRepository.save(pkg);

    res.json(updated);
  } catch (error: any) {
    console.error('Link package to store error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Unlink a package from a store (admin only)
export const unlinkPackageFromStore = async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, packageId } = req.params;

    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can unlink packages from stores' });
    }

    const pkg = await packageRepository.findOne({ where: { id: packageId, storeId } });
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found or not linked to this store' });
    }

    // Unlink the package from the store
    pkg.storeId = null as any;
    const updated = await packageRepository.save(pkg);

    res.json(updated);
  } catch (error: any) {
    console.error('Unlink package from store error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Post flash deal (admin only - create featured package)
export const postFlashDeal = async (req: AuthRequest, res: Response) => {
  try {
    const {
      selectedPackageName,
      panelRange,
      batteryType,
      maxBatteryLithium,
      maxBatteryTubular,
      inverterType,
      powers,
      warranty,
      description,
      price,
      storeId,
      images,
      quantity
    } = req.body;

    console.log('[POST FLASH DEAL] Request received:', { selectedPackageName, price, storeId, images: images?.length });
    console.log('[POST FLASH DEAL] User:', { userId: req.user?.userId, role: req.user?.role });

    // Check if user is admin or vendor
    const isAdmin = req.user?.role === 'admin';
    const isVendor = req.user?.role === 'vendor';

    if (!isAdmin && !isVendor) {
      console.log('[POST FLASH DEAL] Access denied - not admin or vendor. User role:', req.user?.role);
      return res.status(403).json({ message: 'Only admins and vendors can post flash deals' });
    }

    // Validate required fields
    if (!selectedPackageName || !price || !storeId) {
      console.log('[POST FLASH DEAL] Validation failed:', { selectedPackageName, price, storeId });
      return res.status(400).json({
        message: 'Missing required fields: package name, price, and store ID are required'
      });
    }

    // For vendors, verify they own the store
    if (isVendor) {
      const Store = AppDataSource.getRepository('Store');
      const store = await Store.findOne({ where: { id: storeId, ownerId: req.user?.userId } });
      if (!store) {
        console.log('[POST FLASH DEAL] Vendor access denied - does not own store:', { storeId, userId: req.user?.userId });
        return res.status(403).json({ message: 'You can only post flash deals for your own store' });
      }
    }

    if (Array.isArray(images) && images.length > 1) {
      return res.status(400).json({ message: 'Only one flash deal image is allowed' });
    }

    const normalizedImages = Array.isArray(images) ? images.slice(0, 1) : [];

    // Create flash deal package
    const flashDealPackage = packageRepository.create({
      name: selectedPackageName,
      panelRange: panelRange || 'custom',
      maxBatteryLithium: maxBatteryLithium || 10,
      maxBatteryTubular: maxBatteryTubular || 10,
      inverterType: inverterType || 'standard',
      vendorPrice: parseFloat(String(price)) * 1.10, // Add 10% markup to all flash deals
      quantity: Number(quantity || 0),
      storeId,
      featured: true, // Mark as featured/flash deal
      isActive: true,
      powers: powers || '3 bedrooms, lights, fan, TV, decoder, phone charging',
      warranty: warranty || 'Panels (10–25 yrs) • Inverter (1–2 yrs) • Battery — Lithium (3–5 yrs) / Tubular (1–2 yrs) • Installation kit (1 yr)',
      description: description || null,
      category: batteryType || 'flash-deal',
      image: normalizedImages.length > 0 ? normalizedImages[0] : null,
      images: normalizedImages
    });

    console.log('[POST FLASH DEAL] Package created:', { id: flashDealPackage.id, name: flashDealPackage.name, featured: flashDealPackage.featured, vendorPrice: flashDealPackage.vendorPrice });

    const savedPackage = await packageRepository.save(flashDealPackage);

    console.log('[POST FLASH DEAL] Package saved successfully:', { id: savedPackage.id, featured: savedPackage.featured, vendorPrice: savedPackage.vendorPrice });

    res.status(201).json({
      message: 'Flash deal posted successfully',
      data: savedPackage
    });
  } catch (error: any) {
    console.error('[POST FLASH DEAL] Error:', error);
    res.status(500).json({ message: error.message || 'Failed to post flash deal' });
  }
};

// Edit flash deal (admin and vendors can edit their own)
export const editFlashDeal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      selectedPackageName,
      panelRange,
      batteryType,
      maxBatteryLithium,
      maxBatteryTubular,
      inverterType,
      powers,
      warranty,
      description,
      price,
      storeId,
      images,
      quantity
    } = req.body;

    console.log('[EDIT FLASH DEAL] Request:', { id, price, userId: req.user?.userId, role: req.user?.role })

    // Find the package
    const pkg = await packageRepository.findOne({
      where: { id },
      relations: ['store']
    });

    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Authorization check - admin can edit any package, vendors can only edit their own
    const isAdmin = req.user?.role === 'admin';
    let isVendorOwner = false;
    if (req.user?.role === 'vendor' && pkg.storeId) {
      const store = await storeRepository.findOne({ where: { id: pkg.storeId } });
      isVendorOwner = Boolean(store && store.ownerId === req.user?.userId);
    }

    if (!isAdmin && !isVendorOwner) {
      console.log('[EDIT FLASH DEAL] Access denied - not authorized');
      return res.status(403).json({ message: 'You do not have permission to edit this flash deal' });
    }

    // Update package fields
    pkg.name = selectedPackageName || pkg.name;
    pkg.panelRange = panelRange !== undefined ? panelRange : pkg.panelRange;
    pkg.maxBatteryLithium = maxBatteryLithium || pkg.maxBatteryLithium;
    pkg.maxBatteryTubular = maxBatteryTubular || pkg.maxBatteryTubular;
    pkg.inverterType = inverterType || pkg.inverterType;
    pkg.powers = powers || pkg.powers;
    pkg.warranty = warranty || pkg.warranty;
    if (description !== undefined) {
      pkg.description = description;
    }
    pkg.category = batteryType || pkg.category;
    
    // Update price with 10% markup
    if (price) {
      pkg.vendorPrice = parseFloat(String(price)) * 1.10;
    }

    if (quantity !== undefined) {
      const parsedQuantity = Number(quantity);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
        return res.status(400).json({ message: 'Quantity must be a non-negative number' });
      }
      pkg.quantity = Math.floor(parsedQuantity);
      if (pkg.quantity > 0) {
        pkg.isActive = true;
        pkg.featured = true;
      }
    }
    
    if (Array.isArray(images) && images.length > 1) {
      return res.status(400).json({ message: 'Only one flash deal image is allowed' });
    }

    // Update images if provided
    if (Array.isArray(images) && images.length > 0) {
      const normalizedImages = images.slice(0, 1);
      pkg.image = normalizedImages[0];
      pkg.images = normalizedImages;
    }

    const updatedPackage = await packageRepository.save(pkg);

    console.log('[EDIT FLASH DEAL] Package updated successfully:', { id: updatedPackage.id, vendorPrice: updatedPackage.vendorPrice });

    res.json({
      message: 'Flash deal updated successfully',
      data: updatedPackage
    });
  } catch (error: any) {
    console.error('[EDIT FLASH DEAL] Error:', error);
    res.status(500).json({ message: error.message || 'Failed to edit flash deal' });
  }
};

// Delete flash deal (admin and vendors can delete their own)
export const deleteFlashDeal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    console.log('[DELETE FLASH DEAL] Request:', { id, userId: req.user?.userId, role: req.user?.role });

    // Find the package
    const pkg = await packageRepository.findOne({
      where: { id },
      relations: ['store']
    });

    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Authorization check - admin can delete any package, vendors can only delete their own
    const isAdmin = req.user?.role === 'admin';
    let isVendorOwner = false;
    if (req.user?.role === 'vendor' && pkg.storeId) {
      const store = await storeRepository.findOne({ where: { id: pkg.storeId } });
      isVendorOwner = Boolean(store && store.ownerId === req.user?.userId);
    }

    if (!isAdmin && !isVendorOwner) {
      console.log('[DELETE FLASH DEAL] Access denied - not authorized');
      return res.status(403).json({ message: 'You do not have permission to delete this flash deal' });
    }

    // Delete the package
    await packageRepository.delete(id);

    console.log('[DELETE FLASH DEAL] Package deleted successfully:', { id });

    res.json({
      message: 'Flash deal deleted successfully'
    });
  } catch (error: any) {
    console.error('[DELETE FLASH DEAL] Error:', error);
    res.status(500).json({ message: error.message || 'Failed to delete flash deal' });
  }
};
