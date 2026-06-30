import { Router } from 'express';
import { getAllPackages, getPackageById, createPackage, updatePackage, deletePackage, vendorPostPackage, getStorePackages, linkPackageToStore, unlinkPackageFromStore, postFlashDeal, editFlashDeal, deleteFlashDeal } from '../controllers/packageController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public endpoints
router.get('/', getAllPackages);
router.get('/:id', getPackageById);
router.get('/store/:storeId', getStorePackages); // Get packages for a store

// Vendor endpoints
router.post('/vendor/post', authMiddleware, vendorPostPackage); // Vendor posts a package

// Admin only endpoints
router.post('/admin/flash-deals', authMiddleware, postFlashDeal); // Post flash deal
router.put('/admin/flash-deals/:id', authMiddleware, editFlashDeal); // Edit flash deal (admin and vendors)
router.delete('/admin/flash-deals/:id', authMiddleware, deleteFlashDeal); // Delete flash deal (admin and vendors)
router.post('/', authMiddleware, createPackage);
router.put('/:id', authMiddleware, updatePackage);
router.delete('/:id', authMiddleware, deletePackage);

// Store package linking (admin only)
router.post('/:packageId/store/:storeId', authMiddleware, linkPackageToStore); // Link package to store
router.delete('/:packageId/store/:storeId', authMiddleware, unlinkPackageFromStore); // Unlink package from store

export default router;
