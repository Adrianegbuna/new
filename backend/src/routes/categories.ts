import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Category } from '../models/Category';
import { SubCategory } from '../models/SubCategory';

const router = Router();
const categoryRepository = AppDataSource.getRepository(Category);
const subcategoryRepository = AppDataSource.getRepository(SubCategory);

// Get all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await categoryRepository.find({
      relations: ['subcategories']
    });
    console.log(`[CATEGORIES API] Found ${categories.length} categories`);
    
    if (categories.length === 0) {
      console.log('[CATEGORIES API] ⚠️ WARNING: No categories found in database!');
    }
    
    // Log category names for debugging
    const categoryNames = categories.map(c => c.name).join(', ');
    console.log(`[CATEGORIES API] Categories: ${categoryNames || 'NONE'}`);
    
    res.json(categories);
  } catch (error: any) {
    console.error('[CATEGORIES API] Error fetching categories:', error.message);
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
});

// Get category by ID with subcategories
router.get('/:categoryId', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const category = await categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['subcategories']
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Failed to fetch category' });
  }
});

// Get subcategories for a category
router.get('/:categoryId/subcategories', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const subcategories = await subcategoryRepository.find({
      where: { 
        categoryId
      }
    });

    console.log(`[CATEGORIES API] Found ${subcategories.length} subcategories for category ${categoryId}`);
    res.json(subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ message: 'Failed to fetch subcategories' });
  }
});

export default router;
