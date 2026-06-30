import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { InstallerProject } from '../models/InstallerProject';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get current user's projects
router.get('/projects', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = req.user as any;
    if (!user.userId) {
      console.error('[GET PROJECTS] Missing userId in auth token');
      return res.status(401).json({ message: 'Invalid auth token' });
    }

    const projectRepo = AppDataSource.getRepository(InstallerProject);
    const projects = await projectRepo.find({
      where: { installerId: user.userId },
      order: { completedDate: 'DESC' }
    });

    res.json(projects);
  } catch (error: any) {
    console.error('[GET PROJECTS] Database error:', {
      message: error?.message,
      code: error?.code,
    });
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Add project (accepts S3 URLs from frontend, not files)
router.post('/projects', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = req.user as any;
    if (!user.userId) {
      console.error('[POST PROJECTS] Missing userId in auth token');
      return res.status(401).json({ message: 'Invalid auth token' });
    }

    const { title, description, category, location, completedDate, images } = req.body;
    
    // Validate required fields
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ message: 'Title is required and must be a string' });
    }
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ message: 'Description is required and must be a string' });
    }

    // Validate images array
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'At least one image URL is required' });
    }

    // Validate each image is a URL
    const validImages = images.filter(img => {
      if (typeof img !== 'string') return false;
      if (!img.startsWith('http://') && !img.startsWith('https://')) return false;
      return true;
    });

    if (validImages.length === 0) {
      return res.status(400).json({ message: 'All images must be valid HTTP(S) URLs' });
    }

    console.log(`[POST PROJECTS] Creating project for user ${user.userId} with ${validImages.length} images`);

    const projectRepo = AppDataSource.getRepository(InstallerProject);
    const project = projectRepo.create({
      title,
      description,
      category: category || 'General',
      location: location || '',
      completedDate: completedDate ? new Date(completedDate) : new Date(),
      images: validImages,
      installerId: user.userId
    });

    await projectRepo.save(project);
    console.log(`[POST PROJECTS] Project created successfully: ${project.id}`);
    
    res.status(201).json(project);
  } catch (error: any) {
    console.error('[POST PROJECTS] Error creating project:', {
      message: error?.message,
      code: error?.code,
      userId: (req.user as any)?.userId,
    });
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Delete project
router.delete('/projects/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = req.user as any;
    const projectId = parseInt(req.params.id, 10);
    const projectRepo = AppDataSource.getRepository(InstallerProject);

    // Find project
    const project = await projectRepo.findOne({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check ownership
    if (project.installerId !== user.userId) {
      return res.status(403).json({ message: 'You can only delete your own projects' });
    }

    // Delete project from database (frontend handles S3 cleanup)
    await projectRepo.remove(project);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

export default router;
