import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { InstallerJob, JobStatus, PaymentStatus } from '../models/InstallerJob';
import { InstallerQuotation } from '../models/InstallerQuotation';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Create a job (from quotation or service package)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      customerId,
      title,
      description,
      location,
      quotationId,
      servicePackageId,
      quotedAmount,
      scheduledStartDate,
      estimatedEndDate,
      workScope
    } = req.body;

    if (!customerId || !title || !description || !quotedAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const jobRepo = AppDataSource.getRepository(InstallerJob);
    
    const job = jobRepo.create({
      installerId: req.user!.userId,
      customerId,
      title,
      description,
      location,
      quotationId: quotationId || null,
      servicePackageId: servicePackageId || null,
      quotedAmount,
      actualAmount: quotedAmount,
      status: JobStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      scheduledStartDate: scheduledStartDate ? new Date(scheduledStartDate) : null,
      estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
      workScope: workScope || description
    } as any);

    await jobRepo.save(job);
    
    res.status(201).json({
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ message: 'Failed to create job' });
  }
});

// Get jobs for installer
router.get('/installer/list', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, sortBy } = req.query;
    
    const jobRepo = AppDataSource.getRepository(InstallerJob);
    let query = jobRepo
      .createQueryBuilder('j')
      .where('j.installerId = :installerId', { installerId: req.user!.userId })
      .leftJoinAndSelect('j.customer', 'customer')
      .leftJoinAndSelect('j.quotation', 'quotation')
      .leftJoinAndSelect('j.servicePackage', 'servicePackage');

    if (status) {
      query = query.andWhere('j.status = :status', { status });
    }

    // Apply sorting
    if (sortBy === 'newest') {
      query = query.orderBy('j.createdAt', 'DESC');
    } else if (sortBy === 'oldest') {
      query = query.orderBy('j.createdAt', 'ASC');
    } else if (sortBy === 'due-date') {
      query = query.orderBy('j.scheduledStartDate', 'ASC');
    } else {
      query = query.orderBy('j.updatedAt', 'DESC');
    }

    const jobs = await query.getMany();
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching installer jobs:', error);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// Get jobs for customer
router.get('/customer/list', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    
    const jobRepo = AppDataSource.getRepository(InstallerJob);
    let query = jobRepo
      .createQueryBuilder('j')
      .where('j.customerId = :customerId', { customerId: req.user!.userId })
      .leftJoinAndSelect('j.installer', 'installer')
      .leftJoinAndSelect('j.quotation', 'quotation')
      .orderBy('j.createdAt', 'DESC');

    if (status) {
      query = query.andWhere('j.status = :status', { status });
    }

    const jobs = await query.getMany();
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching customer jobs:', error);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// Get single job
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const jobRepo = AppDataSource.getRepository(InstallerJob);
    
    const job = await jobRepo
      .createQueryBuilder('j')
      .where('j.id = :id', { id: req.params.id })
      .leftJoinAndSelect('j.installer', 'installer')
      .leftJoinAndSelect('j.customer', 'customer')
      .leftJoinAndSelect('j.quotation', 'quotation')
      .leftJoinAndSelect('j.servicePackage', 'servicePackage')
      .getOne();

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Verify user is installer or customer
    if (job.installerId !== req.user!.userId && job.customerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized to view this job' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ message: 'Failed to fetch job' });
  }
});

// Update job status (installer only)
router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    
    if (!Object.values(JobStatus).includes(status)) {
      return res.status(400).json({ message: 'Invalid job status' });
    }

    const jobRepo = AppDataSource.getRepository(InstallerJob);
    
    const job = await jobRepo.findOne({
      where: { id: req.params.id }
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.installerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    // Update status-related dates
    if (status === JobStatus.IN_PROGRESS && !job.actualStartDate) {
      job.actualStartDate = new Date();
    }

    if (status === JobStatus.COMPLETED && !job.completionDate) {
      job.completionDate = new Date();
    }

    job.status = status;
    await jobRepo.save(job);
    
    res.json({
      message: 'Job status updated successfully',
      job
    });
  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ message: 'Failed to update job status' });
  }
});

// Update job details
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      description,
      location,
      workScope,
      scheduledStartDate,
      estimatedEndDate,
      actualAmount,
      completionNotes,
      warrantyTerms,
      beforePhotos,
      afterPhotos,
      documents
    } = req.body;
    
    const jobRepo = AppDataSource.getRepository(InstallerJob);
    
    const job = await jobRepo.findOne({
      where: { id: req.params.id }
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.installerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    Object.assign(job, {
      title: title || job.title,
      description: description || job.description,
      location: location || job.location,
      workScope: workScope || job.workScope,
      scheduledStartDate: scheduledStartDate ? new Date(scheduledStartDate) : job.scheduledStartDate,
      estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : job.estimatedEndDate,
      actualAmount: actualAmount !== undefined ? actualAmount : job.actualAmount,
      completionNotes: completionNotes || job.completionNotes,
      warrantyTerms: warrantyTerms || job.warrantyTerms,
      beforePhotos: beforePhotos || job.beforePhotos,
      afterPhotos: afterPhotos || job.afterPhotos,
      documents: documents || job.documents
    });

    await jobRepo.save(job);
    
    res.json({
      message: 'Job updated successfully',
      job
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Failed to update job' });
  }
});

// Update payment status
router.patch('/:id/payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { paymentStatus, amountPaid, paymentMethod } = req.body;
    
    const jobRepo = AppDataSource.getRepository(InstallerJob);
    
    const job = await jobRepo.findOne({
      where: { id: req.params.id }
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.installerId !== req.user!.userId && job.customerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized to update payment' });
    }

    if (paymentStatus) {
      job.paymentStatus = paymentStatus;
    }

    if (amountPaid !== undefined) {
      job.amountPaid = amountPaid;
    }

    if (paymentMethod) {
      job.paymentMethod = paymentMethod;
    }

    if (paymentStatus === PaymentStatus.COMPLETED && !job.paymentDate) {
      job.paymentDate = new Date();
    }

    await jobRepo.save(job);
    
    res.json({
      message: 'Payment updated successfully',
      job
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ message: 'Failed to update payment' });
  }
});

// Accept job (customer)
router.post('/:id/accept', authenticate, async (req: AuthRequest, res) => {
  try {
    const jobRepo = AppDataSource.getRepository(InstallerJob);
    
    const job = await jobRepo.findOne({
      where: { id: req.params.id }
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.customerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    job.status = JobStatus.ACCEPTED;
    await jobRepo.save(job);
    
    res.json({
      message: 'Job accepted',
      job
    });
  } catch (error) {
    console.error('Error accepting job:', error);
    res.status(500).json({ message: 'Failed to accept job' });
  }
});

// Cancel job
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    
    const jobRepo = AppDataSource.getRepository(InstallerJob);
    
    const job = await jobRepo.findOne({
      where: { id: req.params.id }
    });

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.installerId !== req.user!.userId && job.customerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    job.status = JobStatus.CANCELLED;
    job.cancellationReason = reason || '';
    job.cancelledAt = new Date();
    job.cancelledBy = job.installerId === req.user!.userId ? 'installer' : 'customer';
    
    await jobRepo.save(job);
    
    res.json({
      message: 'Job cancelled',
      job
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ message: 'Failed to cancel job' });
  }
});

export default router;
