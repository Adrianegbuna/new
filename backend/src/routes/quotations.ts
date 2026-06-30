import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { InstallerQuotation, QuotationStatus } from '../models/InstallerQuotation';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Create a new quotation
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { customerId, description, projectScope, location, itemizedCosts, subtotal, taxAmount, totalAmount, validUntil, estimatedDuration, notes, terms, servicePackageId } = req.body;

    if (!description || !totalAmount) {
      return res.status(400).json({ message: 'Description and totalAmount are required' });
    }

    const quotationRepo = AppDataSource.getRepository(InstallerQuotation);
    
    const quotation = quotationRepo.create({
      installerId: req.user!.userId,
      customerId: customerId || null,
      description,
      projectScope,
      location,
      itemizedCosts: itemizedCosts || [],
      subtotal: subtotal || totalAmount,
      taxAmount: taxAmount || 0,
      totalAmount,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      estimatedDuration,
      status: QuotationStatus.DRAFT,
      servicePackageId: servicePackageId || null,
      notes,
      terms
    } as any);

    await quotationRepo.save(quotation);
    
    res.status(201).json({
      message: 'Quotation created successfully',
      quotation
    });
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ message: 'Failed to create quotation' });
  }
});

// Get quotations for current installer
router.get('/installer/list', authenticate, async (req: AuthRequest, res) => {
  try {
    const quotationRepo = AppDataSource.getRepository(InstallerQuotation);
    
    const quotations = await quotationRepo
      .createQueryBuilder('q')
      .where('q.installerId = :installerId', { installerId: req.user!.userId })
      .leftJoinAndSelect('q.customer', 'customer')
      .orderBy('q.createdAt', 'DESC')
      .getMany();

    res.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ message: 'Failed to fetch quotations' });
  }
});

// Get quotations for current customer
router.get('/customer/list', authenticate, async (req: AuthRequest, res) => {
  try {
    const quotationRepo = AppDataSource.getRepository(InstallerQuotation);
    
    const quotations = await quotationRepo
      .createQueryBuilder('q')
      .where('q.customerId = :customerId', { customerId: req.user!.userId })
      .leftJoinAndSelect('q.installer', 'installer')
      .orderBy('q.createdAt', 'DESC')
      .getMany();

    res.json(quotations);
  } catch (error) {
    console.error('Error fetching customer quotations:', error);
    res.status(500).json({ message: 'Failed to fetch quotations' });
  }
});

// Get single quotation
router.get('/:id', async (req, res) => {
  try {
    const quotationRepo = AppDataSource.getRepository(InstallerQuotation);
    
    const quotation = await quotationRepo
      .createQueryBuilder('q')
      .where('q.id = :id', { id: req.params.id })
      .leftJoinAndSelect('q.installer', 'installer')
      .leftJoinAndSelect('q.customer', 'customer')
      .getOne();

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Mark as viewed if user is the customer
    if (quotation.customerId && !quotation.viewedAt) {
      quotation.viewedAt = new Date();
      await quotationRepo.save(quotation);
    }

    res.json(quotation);
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ message: 'Failed to fetch quotation' });
  }
});

// Update quotation (installer only)
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { description, projectScope, location, itemizedCosts, subtotal, taxAmount, totalAmount, validUntil, estimatedDuration, notes, terms } = req.body;
    
    const quotationRepo = AppDataSource.getRepository(InstallerQuotation);
    
    const quotation = await quotationRepo.findOne({
      where: { id: req.params.id }
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.installerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized to update this quotation' });
    }

    if (quotation.status !== QuotationStatus.DRAFT) {
      return res.status(400).json({ message: 'Can only edit draft quotations' });
    }

    Object.assign(quotation, {
      description: description || quotation.description,
      projectScope: projectScope || quotation.projectScope,
      location: location || quotation.location,
      itemizedCosts: itemizedCosts || quotation.itemizedCosts,
      subtotal: subtotal !== undefined ? subtotal : quotation.subtotal,
      taxAmount: taxAmount !== undefined ? taxAmount : quotation.taxAmount,
      totalAmount: totalAmount || quotation.totalAmount,
      validUntil: validUntil ? new Date(validUntil) : quotation.validUntil,
      estimatedDuration: estimatedDuration || quotation.estimatedDuration,
      notes: notes || quotation.notes,
      terms: terms || quotation.terms
    });

    await quotationRepo.save(quotation);
    
    res.json({
      message: 'Quotation updated successfully',
      quotation
    });
  } catch (error) {
    console.error('Error updating quotation:', error);
    res.status(500).json({ message: 'Failed to update quotation' });
  }
});

// Send quotation to customer
router.post('/:id/send', authenticate, async (req: AuthRequest, res) => {
  try {
    const { customerId } = req.body;
    
    const quotationRepo = AppDataSource.getRepository(InstallerQuotation);
    
    const quotation = await quotationRepo.findOne({
      where: { id: req.params.id }
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.installerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    quotation.customerId = customerId;
    quotation.status = QuotationStatus.SENT;
    
    await quotationRepo.save(quotation);
    
    res.json({
      message: 'Quotation sent to customer',
      quotation
    });
  } catch (error) {
    console.error('Error sending quotation:', error);
    res.status(500).json({ message: 'Failed to send quotation' });
  }
});

// Accept quotation (customer only)
router.post('/:id/accept', authenticate, async (req: AuthRequest, res) => {
  try {
    const quotationRepo = AppDataSource.getRepository(InstallerQuotation);
    
    const quotation = await quotationRepo.findOne({
      where: { id: req.params.id }
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.customerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized to accept this quotation' });
    }

    quotation.status = QuotationStatus.ACCEPTED;
    await quotationRepo.save(quotation);
    
    res.json({
      message: 'Quotation accepted. Installer will contact you soon.',
      quotation
    });
  } catch (error) {
    console.error('Error accepting quotation:', error);
    res.status(500).json({ message: 'Failed to accept quotation' });
  }
});

// Reject quotation (customer only)
router.post('/:id/reject', authenticate, async (req: AuthRequest, res) => {
  try {
    const quotationRepo = AppDataSource.getRepository(InstallerQuotation);
    
    const quotation = await quotationRepo.findOne({
      where: { id: req.params.id }
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.customerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized to reject this quotation' });
    }

    quotation.status = QuotationStatus.REJECTED;
    await quotationRepo.save(quotation);
    
    res.json({
      message: 'Quotation rejected',
      quotation
    });
  } catch (error) {
    console.error('Error rejecting quotation:', error);
    res.status(500).json({ message: 'Failed to reject quotation' });
  }
});

// Delete quotation (installer only)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const quotationRepo = AppDataSource.getRepository(InstallerQuotation);
    
    const quotation = await quotationRepo.findOne({
      where: { id: req.params.id }
    });

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    if (quotation.installerId !== req.user!.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this quotation' });
    }

    await quotationRepo.remove(quotation);
    
    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    console.error('Error deleting quotation:', error);
    res.status(500).json({ message: 'Failed to delete quotation' });
  }
});

export default router;
