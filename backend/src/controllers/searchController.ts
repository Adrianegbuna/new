import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import { getRepository } from 'typeorm';
import { Product } from '../models/Product';
import { InstallerServicePackage } from '../models/InstallerServicePackage';

export const searchServices = async (req: AuthRequest, res: Response) => {
  try {
    const rawQuery = (req.query.q as string || '').trim();

    // Return empty array for empty/space-only queries
    if (!rawQuery || rawQuery.length === 0) {
      return res.json({ services: [] });
    }

    const serviceRepo = getRepository(InstallerServicePackage);
    const services = await serviceRepo.createQueryBuilder('service')
      .where(
        'LOWER(service.name) LIKE LOWER(:query) OR LOWER(service.description) LIKE LOWER(:query)',
        { query: `%${rawQuery}%` }
      )
      .limit(50)
      .getMany();

    // Ensure text fields are properly encoded
    res.json({ 
      services: services.map(s => ({
        ...s,
        name: s.name || '',
        description: s.description || '',
      }))
    });
  } catch (error: any) {
    console.error('Service search error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};

export const searchDealers = async (req: AuthRequest, res: Response) => {
  try {
    const rawQuery = (req.query.q as string || '').trim();

    // Return empty array for space-only queries
    if (!rawQuery || rawQuery.length === 0) {
      return res.json({ dealers: [] });
    }

    const storeRepo = getRepository(Product);
    const dealers = await storeRepo.createQueryBuilder('store')
      .leftJoinAndSelect('store.vendor', 'vendor')
      .where(
        'LOWER(store.name) LIKE LOWER(:query) OR LOWER(store.location) LIKE LOWER(:query)',
        { query: `%${rawQuery}%` }
      )
      .limit(50)
      .getMany();

    res.json({ dealers });
  } catch (error: any) {
    console.error('Dealer search error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};