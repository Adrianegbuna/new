import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User';
import { InstallerProject } from '../models/InstallerProject';
import { Review } from '../models/Review';
import { SiteInquiry, SenderType } from '../models/SiteInquiry';
import { NotificationType } from '../models/Notification';
import { NotificationService } from '../services/notificationService';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all installers (public endpoint - no auth required)
router.get('/', async (req, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const projectRepo = AppDataSource.getRepository(InstallerProject);
    const reviewRepo = AppDataSource.getRepository(Review);
    
    const installers = await userRepo.find({
      where: {
        role: UserRole.INSTALLER,
        verificationStatus: 'approved',
      }
    });

    // Get project counts and ratings for each installer
    const installerData = await Promise.all(
      installers.map(async (installer) => {
        const projectCount = await projectRepo.count({
          where: { installerId: installer.id }
        });

        // Calculate rating from reviews
        const reviews = await reviewRepo.find({
          where: { reviewType: 'installer', targetId: installer.id }
        });

        const rating = reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
          : 0;

        return { 
          installerId: installer.id, 
          projectCount,
          rating: parseFloat(rating.toFixed(1))
        };
      })
    );

    const installerDataMap = new Map(
      installerData.map(data => [data.installerId, { projectCount: data.projectCount, rating: data.rating }])
    );

    res.json(installers.map(installer => {
      const data = installerDataMap.get(installer.id);
      return {
        id: installer.id,
        firstName: installer.firstName,
        lastName: installer.lastName,
        email: installer.email,
        phone: installer.phone,
        certifications: installer.certifications,
        yearsOfExperience: installer.yearsOfExperience,
        serviceAreas: installer.serviceAreas,
        country: installer.country,
        city: installer.city,
        bio: installer.bio,
        profilePhoto: installer.profilePhoto,
        rating: data?.rating || 0,
        completedProjects: data?.projectCount || 0,
        verified: installer.isVerified
          ? true
          : false
      };
    }));
  } catch (error) {
    console.error('Error fetching installers:', error);
    res.status(500).json({ message: 'Failed to fetch installers' });
  }
});

// Get installer by ID (public endpoint)
router.get('/:id', async (req, res) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const projectRepo = AppDataSource.getRepository(InstallerProject);
    const reviewRepo = AppDataSource.getRepository(Review);
    
    const installer = await userRepo.findOne({
      where: {
        id: req.params.id,
        role: UserRole.INSTALLER,
        verificationStatus: 'approved',
      }
    });

    if (!installer) {
      return res.status(404).json({ message: 'Installer not found' });
    }

    // Get project count
    const completedProjects = await projectRepo.count({
      where: { installerId: installer.id }
    });

    // Calculate rating from reviews
    const reviews = await reviewRepo.find({
      where: { reviewType: 'installer', targetId: installer.id }
    });

    const rating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    res.json({
      id: installer.id,
      firstName: installer.firstName,
      lastName: installer.lastName,
      email: installer.email,
      phone: installer.phone,
      certifications: installer.certifications,
      yearsOfExperience: installer.yearsOfExperience,
      serviceAreas: installer.serviceAreas,
      country: installer.country,
      city: installer.city,
      bio: installer.bio,
      profilePhoto: installer.profilePhoto,
      specialties: installer.specialties ? installer.specialties.split(',') : [],
      rating: parseFloat(rating.toFixed(1)),
      completedProjects: completedProjects,
      verified: installer.isVerified
        ? true
        : false
    });
  } catch (error) {
    console.error('Error fetching installer:', error);
    res.status(500).json({ message: 'Failed to fetch installer' });
  }
});

// Get installer projects
router.get('/:id/projects', async (req, res) => {
  try {
    const projectRepo = AppDataSource.getRepository(InstallerProject);
    const projects = await projectRepo.find({
      where: { installerId: req.params.id },
      order: { completedDate: 'DESC' }
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Add installer project (accepts S3 URLs from frontend, not files)
router.post('/:id/projects', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = req.user as any;
    if (!user.userId) {
      console.error('[POST /:id/projects] Missing userId in auth token');
      return res.status(401).json({ message: 'Invalid auth token' });
    }
    
    if (user.userId !== req.params.id) {
      console.warn('[POST /:id/projects] User ID mismatch:', { userId: user.userId, paramId: req.params.id });
      return res.status(403).json({ message: 'Unauthorized - cannot create projects for other users' });
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

    console.log(`[POST /:id/projects] Creating project for user ${user.userId} with ${validImages.length} images`);

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
    console.log(`[POST /:id/projects] Project created successfully: ${project.id}`);
    
    res.status(201).json(project);
  } catch (error: any) {
    console.error('[POST /:id/projects] Error creating project:', {
      message: error?.message,
      code: error?.code,
      userId: (req.user as any)?.userId,
      paramId: req.params.id,
    });
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Get installer reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviewRepo = AppDataSource.getRepository(Review);
    const reviews = await reviewRepo.find({
      where: { reviewType: 'installer', targetId: req.params.id },
      order: { createdAt: 'DESC' }
    });

    res.json(reviews.map(review => ({
      id: review.id,
      customerName: review.userName,
      rating: review.rating,
      comment: review.comment,
      date: review.createdAt
    })));
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Add installer review
router.post('/:id/reviews', authenticate, async (req: AuthRequest, res) => {
  try {
    const { rating, comment } = req.body;
    const authUser = req.user as any;

    if (!rating || !comment) {
      return res.status(400).json({ message: 'Rating and comment are required' });
    }

    // Get user details from database
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: authUser.userId } });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const reviewRepo = AppDataSource.getRepository(Review);
    const review = reviewRepo.create({
      rating,
      comment,
      reviewType: 'installer',
      targetId: req.params.id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`
    });

    await reviewRepo.save(review);

    res.status(201).json({
      id: review.id,
      customerName: review.userName,
      rating: review.rating,
      comment: review.comment,
      date: review.createdAt
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Failed to create review' });
  }
});

// Send contact inquiry - now saves to database
router.post('/:id/contact', async (req, res) => {
  try {
    const { name, email, phone, message, projectType } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required' });
    }

    // Save to SiteInquiry table
    const inquiryRepository = AppDataSource.getRepository(SiteInquiry);
    const installerRepo = AppDataSource.getRepository(User);
    const installer = await installerRepo.findOne({ where: { id: req.params.id } });
    const installerName = installer ? `${installer.firstName || ''} ${installer.lastName || ''}`.trim() : '';
    const installerEmail = installer?.email || '';
    const installerPhone = installer?.phone || '';

    const installerHeaderLines = [
      `Installer ID: ${req.params.id}`,
      installerName ? `Installer: ${installerName}` : '',
      installerEmail ? `Installer Email: ${installerEmail}` : '',
      installerPhone ? `Installer Phone: ${installerPhone}` : '',
    ].filter(Boolean);
    
    const inquiry = inquiryRepository.create({
      senderName: name,
      senderEmail: email,
      senderPhone: phone || '',
      senderType: SenderType.CUSTOMER,
      subject: `Installer Inquiry: ${projectType || 'General'}${installerName ? ` | ${installerName}` : ''}`,
      message: `${installerHeaderLines.join('\n')}\n\nMessage:\n${message}`,
      projectType: projectType || null,
    });

    const saved = await inquiryRepository.save(inquiry);
    console.log('[INSTALLER CONTACT] Inquiry saved to database:', { 
      id: saved.id,
      name, 
      email, 
      subject: saved.subject,
      installerId: req.params.id 
    });

    try {
      if (installer?.id) {
        await NotificationService.createNotification(
          installer.id,
          NotificationType.MESSAGE,
          'New installer request',
          `${name} requested your services${projectType ? ` (${projectType})` : ''}.`,
          { relatedId: String(saved.id), actionUrl: '/messages?tab=notifications' }
        );
      }
    } catch (notifyError) {
      console.warn('[INSTALLER CONTACT] Failed to notify installer:', notifyError);
    }
    
    res.json({ 
      message: 'Inquiry sent successfully', 
      inquiryId: saved.id 
    });
  } catch (error) {
    console.error('[INSTALLER CONTACT] Error saving inquiry:', error);
    res.status(500).json({ message: 'Failed to send inquiry' });
  }
});

export default router;
