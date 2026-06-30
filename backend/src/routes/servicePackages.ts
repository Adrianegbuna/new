import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { InstallerServicePackage, ServiceType } from '../models/InstallerServicePackage';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Create service package (installer only)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      description,
      serviceType,
      basePrice,
      discountPrice,
      isCustomizable,
      scopeOfWork,
      inclusions,
      exclusions,
      estimatedDuration,
      estimatedWorkers,
      warrantyPeriod,
      warrantyDetails,
      includesInstallation,
      includesMaintenance,
      maintenancePeriod,
      isPublic,
      coverImage,
      images,
      tags
    } = req.body;

    if (!name || !description || !basePrice || !scopeOfWork) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const packageRepo = AppDataSource.getRepository(InstallerServicePackage);
    
    const servicePackage = packageRepo.create({
      installerId: req.user!.userId,
      name,
      description,
      serviceType: serviceType || ServiceType.RESIDENTIAL,
      basePrice,
      discountPrice: discountPrice || null,
      isCustomizable: isCustomizable || false,
      scopeOfWork,
      inclusions: inclusions || [],
      exclusions: exclusions || [],
      estimatedDuration,
      estimatedWorkers: estimatedWorkers || null,
      warrantyPeriod,
      warrantyDetails,
      includesInstallation: includesInstallation || false,
      includesMaintenance: includesMaintenance || false,
      maintenancePeriod,
      isActive: true,
      isPublic: isPublic !== false,
      coverImage: coverImage || null,
      images: images || [],
      tags: tags || []
    } as any);

    await packageRepo.save(servicePackage);
    
    res.status(201).json({
      message: 'Service package created successfully',
      package: servicePackage
    });
  } catch (error) {
    console.error('Error creating service package:', error);
    res.status(500).json({ message: 'Failed to create service package' });
  }
});

// Get all public service packages
router.get('/', async (req, res) => {
  try {
    const { installerIds, serviceType, sortBy } = req.query;
    
    const packageRepo = AppDataSource.getRepository(InstallerServicePackage);
    let query = packageRepo
      .createQueryBuilder('p')
      .where('p.isPublic = :isPublic AND p.isActive = :isActive', { isPublic: true, isActive: true })
      .leftJoinAndSelect('p.installer', 'installer');

    if (installerIds) {
      const ids = (installerIds as string).split(',');
      query = query.andWhere('p.installerId IN (:...installerIds)', { installerIds: ids });
    }

    if (serviceType) {
      query = query.andWhere('p.serviceType = :serviceType', { serviceType });
    }

    // Apply sorting
    if (sortBy === 'price-low') {
      query = query.orderBy('p.basePrice', 'ASC');
    } else if (sortBy === 'price-high') {
      query = query.orderBy('p.basePrice', 'DESC');
    } else if (sortBy === 'rating') {
      query = query.orderBy('p.viewCount', 'DESC');
    } else {
      query = query.orderBy('p.createdAt', 'DESC');
    }

    const packages = await query.getMany();

    res.json(packages);
  } catch (error) {
    console.error('Error fetching service packages:', error);
    res.status(500).json({ message: 'Failed to fetch service packages' });
  }
});

// Get service packages for current installer
router.get('/installer/list', authenticate, async (req: AuthRequest, res) => {
  try {
    const packageRepo = AppDataSource.getRepository(InstallerServicePackage);
    
    const packages = await packageRepo
      .createQueryBuilder('p')
      .where('p.installerId = :installerId', { installerId: req.user!.userId })
      .orderBy('p.createdAt', 'DESC')
      .getMany();

    res.json(packages);
  } catch (error) {
    console.error('Error fetching installer packages:', error);
    res.status(500).json({ message: 'Failed to fetch packages' });
  }
});

// Get single service package
router.get('/:id', async (req, res) => {
  try {
    const packageRepo = AppDataSource.getRepository(InstallerServicePackage);
    
    const servicePackage = await packageRepo
      .createQueryBuilder('p')
      .where('p.id = :id', { id: req.params.id })
      .leftJoinAndSelect('p.installer', 'installer')
      .getOne();

    if (!servicePackage) {
      return res.status(404).json({ message: 'Service package not found' });
    }

    // Increment view count
    servicePackage.viewCount++;
    await packageRepo.save(servicePackage);

    res.json(servicePackage);
  } catch (error) {
    console.error('Error fetching service package:', error);
    res.status(500).json({ message: 'Failed to fetch service package' });
  }
});

// Update service package (installer only)
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      description,
      basePrice,
      discountPrice,
      isCustomizable,
      scopeOfWork,
      inclusions,
      exclusions,
      estimatedDuration,
      estimatedWorkers,
      warrantyPeriod,
      warrantyDetails,
      includesInstallation,
      includesMaintenance,
      maintenancePeriod,
      isActive,
      isPublic,
      coverImage,
      images,
      tags
    } = req.body;
    
    const packageRepo = AppDataSource.getRepository(InstallerServicePackage);
    
    const servicePackage = await packageRepo.findOne({
      where: { id: req.params.id }
    });

    if (!servicePackage) {
      return res.status(404).json({ message: 'Service package not found' });
    }

    if (servicePackage.installerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized to update this package' });
    }

    Object.assign(servicePackage, {
      name: name || servicePackage.name,
      description: description || servicePackage.description,
      basePrice: basePrice !== undefined ? basePrice : servicePackage.basePrice,
      discountPrice: discountPrice !== undefined ? discountPrice : servicePackage.discountPrice,
      isCustomizable: isCustomizable !== undefined ? isCustomizable : servicePackage.isCustomizable,
      scopeOfWork: scopeOfWork || servicePackage.scopeOfWork,
      inclusions: inclusions || servicePackage.inclusions,
      exclusions: exclusions || servicePackage.exclusions,
      estimatedDuration: estimatedDuration || servicePackage.estimatedDuration,
      estimatedWorkers: estimatedWorkers || servicePackage.estimatedWorkers,
      warrantyPeriod: warrantyPeriod || servicePackage.warrantyPeriod,
      warrantyDetails: warrantyDetails || servicePackage.warrantyDetails,
      includesInstallation: includesInstallation !== undefined ? includesInstallation : servicePackage.includesInstallation,
      includesMaintenance: includesMaintenance !== undefined ? includesMaintenance : servicePackage.includesMaintenance,
      maintenancePeriod: maintenancePeriod || servicePackage.maintenancePeriod,
      isActive: isActive !== undefined ? isActive : servicePackage.isActive,
      isPublic: isPublic !== undefined ? isPublic : servicePackage.isPublic,
      coverImage: coverImage || servicePackage.coverImage,
      images: images || servicePackage.images,
      tags: tags || servicePackage.tags
    });

    await packageRepo.save(servicePackage);
    
    res.json({
      message: 'Service package updated successfully',
      package: servicePackage
    });
  } catch (error) {
    console.error('Error updating service package:', error);
    res.status(500).json({ message: 'Failed to update service package' });
  }
});

// Delete service package (installer only)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const packageRepo = AppDataSource.getRepository(InstallerServicePackage);
    
    const servicePackage = await packageRepo.findOne({
      where: { id: req.params.id }
    });

    if (!servicePackage) {
      return res.status(404).json({ message: 'Service package not found' });
    }

    if (servicePackage.installerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this package' });
    }

    await packageRepo.remove(servicePackage);
    
    res.json({ message: 'Service package deleted successfully' });
  } catch (error) {
    console.error('Error deleting service package:', error);
    res.status(500).json({ message: 'Failed to delete service package' });
  }
});

export default router;
