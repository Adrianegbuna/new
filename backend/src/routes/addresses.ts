import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { UserAddress } from '../models/UserAddress';

const router = Router();
const addressRepo = AppDataSource.getRepository(UserAddress);

const buildAddressEntity = (req: AuthRequest, body: any): UserAddress => {
  const { label, recipientName, phone, street, city, state, country, postalCode, isDefault } = body;
  const entity = new UserAddress();
  entity.userId = req.user!.userId;
  entity.label = label ? String(label) : undefined;
  entity.recipientName = String(recipientName);
  entity.phone = String(phone);
  entity.street = String(street);
  entity.city = String(city);
  entity.state = state ? String(state) : undefined;
  entity.country = country ? String(country) : undefined;
  entity.postalCode = postalCode ? String(postalCode) : undefined;
  entity.isDefault = Boolean(isDefault);
  return entity;
};

const clearDefaultAddress = async (userId: string): Promise<void> => {
  await addressRepo
    .createQueryBuilder()
    .update(UserAddress)
    .set({ isDefault: false })
    .where('userId = :userId', { userId })
    .execute();
};

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const addresses = await addressRepo.find({
      where: { userId: req.user!.userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
    res.json(addresses);
  } catch (error) {
    console.error('[ADDRESS] list error:', error);
    res.status(500).json({ message: 'Failed to fetch addresses' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { label, recipientName, phone, street, city, state, country, postalCode, isDefault } = req.body;
    if (!recipientName || !phone || !street || !city) {
      return res.status(400).json({ message: 'recipientName, phone, street and city are required' });
    }

    if (Boolean(isDefault)) {
      await clearDefaultAddress(req.user!.userId);
    }

    const created = buildAddressEntity(req, req.body);
    const saved = await addressRepo.save(created);
    res.status(201).json(saved);
  } catch (error) {
    console.error('[ADDRESS] create error:', error);
    res.status(500).json({ message: 'Failed to create address' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const address = await addressRepo.findOne({
      where: { id: req.params.id, userId: req.user!.userId }
    });
    if (!address) return res.status(404).json({ message: 'Address not found' });

    const { label, recipientName, phone, street, city, state, country, postalCode, isDefault } = req.body;

    if (Boolean(isDefault)) {
      await clearDefaultAddress(req.user!.userId);
      address.isDefault = true;
    }

    address.label = label != null ? String(label) : address.label;
    address.recipientName = recipientName != null ? String(recipientName) : address.recipientName;
    address.phone = phone != null ? String(phone) : address.phone;
    address.street = street != null ? String(street) : address.street;
    address.city = city != null ? String(city) : address.city;
    address.state = state != null ? String(state) : address.state;
    address.country = country != null ? String(country) : address.country;
    address.postalCode = postalCode != null ? String(postalCode) : address.postalCode;

    const saved = await addressRepo.save(address);
    res.json(saved);
  } catch (error) {
    console.error('[ADDRESS] update error:', error);
    res.status(500).json({ message: 'Failed to update address' });
  }
});

router.patch('/:id/default', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const address = await addressRepo.findOne({
      where: { id: req.params.id, userId: req.user!.userId }
    });
    if (!address) return res.status(404).json({ message: 'Address not found' });

    await clearDefaultAddress(req.user!.userId);
    address.isDefault = true;
    const saved = await addressRepo.save(address);
    res.json(saved);
  } catch (error) {
    console.error('[ADDRESS] set default error:', error);
    res.status(500).json({ message: 'Failed to set default address' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const address = await addressRepo.findOne({
      where: { id: req.params.id, userId: req.user!.userId }
    });
    if (!address) return res.status(404).json({ message: 'Address not found' });
    await addressRepo.remove(address);
    res.json({ message: 'Address removed' });
  } catch (error) {
    console.error('[ADDRESS] delete error:', error);
    res.status(500).json({ message: 'Failed to delete address' });
  }
});

export default router;
