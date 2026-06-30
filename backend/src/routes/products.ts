import { Router } from 'express';
import { getAllProducts, getAllVendorProducts, getProductById, searchProducts, createProduct, updateProduct, deleteProduct, getVendorProducts, updateProductPrice, getProductRating } from '../controllers/productController';
import { authMiddleware } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

router.get('/all-vendor', getAllVendorProducts);
router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/vendor/my-products', authMiddleware, getVendorProducts);
router.get('/:id/rating', getProductRating);
router.get('/:id', getProductById);
router.post('/', authMiddleware, upload.fields([{ name: 'images', maxCount: 1 }, { name: 'videos', maxCount: 1 }]), createProduct);
router.put('/:id/price', authMiddleware, updateProductPrice);
router.patch('/:id/price', authMiddleware, updateProductPrice); // Support PATCH as well
router.put('/:id', authMiddleware, updateProduct);
router.patch('/:id', authMiddleware, updateProduct); // Support PATCH for updates
router.delete('/:id', authMiddleware, deleteProduct);

export default router;
