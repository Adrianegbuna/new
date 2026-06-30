import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { AdBanner } from '../models/AdBanner';
import { AuthRequest } from '../middleware/auth';

const bannerRepository = AppDataSource.getRepository(AdBanner);

const parseOptionalDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const normalizeMediaType = (value: any) => String(value || '').toLowerCase();
const normalizeBannerType = (value: any) => String(value || '').toLowerCase();

const resolveRedirectUrl = (type?: string, redirectUrl?: string) => {
  if (redirectUrl) return redirectUrl;
  switch (type) {
    case 'flash_deal':
      return '/flash-deals';
    case 'swap_resale':
      return '/swap-resale';
    case 'product':
      return '/products';
    default:
      return undefined;
  }
};

// Public: get active banners
export const getActiveAdBanners = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const banners = await bannerRepository
      .createQueryBuilder('ad')
      .where('ad.isActive = :isActive', { isActive: true })
      .andWhere('(ad.startAt IS NULL OR ad.startAt <= :now)', { now })
      .andWhere('(ad.endAt IS NULL OR ad.endAt >= :now)', { now })
      .orderBy('ad.displayOrder', 'ASC')
      .addOrderBy('ad.createdAt', 'DESC')
      .getMany();

    res.json(banners);
  } catch (error) {
    console.error('[GET AD BANNERS] Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: list all banners
export const getAllAdBanners = async (req: AuthRequest, res: Response) => {
  try {
    const banners = await bannerRepository.find({
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
    res.json(banners);
  } catch (error) {
    console.error('[ADMIN GET AD BANNERS] Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: create banner
export const createAdBanner = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      mediaUrl,
      mediaType,
      linkUrl,
      redirectUrl,
      type,
      ctaText,
      durationSeconds,
      displayOrder,
      isActive,
      startAt,
      endAt,
    } = req.body || {};

    const normalizedMediaType = normalizeMediaType(mediaType);
    const normalizedType = normalizeBannerType(type);
    if (!title || !mediaUrl || !['image', 'video'].includes(normalizedMediaType)) {
      return res.status(400).json({ message: 'title, mediaUrl, and mediaType (image|video) are required' });
    }
    if (type && !['flash_deal', 'product', 'swap_resale'].includes(normalizedType)) {
      return res.status(400).json({ message: 'type must be flash_deal, product, or swap_resale' });
    }

    const parsedStartAt = parseOptionalDate(startAt);
    const parsedEndAt = parseOptionalDate(endAt);
    if (startAt && !parsedStartAt) {
      return res.status(400).json({ message: 'Invalid startAt date' });
    }
    if (endAt && !parsedEndAt) {
      return res.status(400).json({ message: 'Invalid endAt date' });
    }

    const bannerData: Partial<AdBanner> = {
      title,
      mediaUrl,
      mediaType: normalizedMediaType as any,
      linkUrl: linkUrl || undefined,
      redirectUrl: resolveRedirectUrl(normalizedType, redirectUrl || undefined),
      type: (normalizedType as any) || undefined,
      image: normalizedMediaType === 'image' ? mediaUrl : undefined,
      ctaText: ctaText || undefined,
      durationSeconds: Number.isFinite(Number(durationSeconds)) ? Number(durationSeconds) : undefined,
      displayOrder: Number.isFinite(Number(displayOrder)) ? Number(displayOrder) : 0,
      isActive: isActive !== false,
      startAt: parsedStartAt || undefined,
      endAt: parsedEndAt || undefined,
    };

    const banner = bannerRepository.create(bannerData);

    const saved = await bannerRepository.save(banner);
    res.status(201).json(saved);
  } catch (error: any) {
    console.error('[CREATE AD BANNER] Error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Admin: update banner
export const updateAdBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const banner = await bannerRepository.findOne({ where: { id } });
    if (!banner) {
      return res.status(404).json({ message: 'Ad banner not found' });
    }

    const {
      title,
      mediaUrl,
      mediaType,
      linkUrl,
      redirectUrl,
      type,
      ctaText,
      durationSeconds,
      displayOrder,
      isActive,
      startAt,
      endAt,
    } = req.body || {};

    if (title !== undefined) banner.title = title;
    if (mediaUrl !== undefined) {
      banner.mediaUrl = mediaUrl;
      if (banner.mediaType === 'image') {
        banner.image = mediaUrl;
      }
    }
    if (mediaType !== undefined) {
      const normalizedMediaType = normalizeMediaType(mediaType);
      if (!['image', 'video'].includes(normalizedMediaType)) {
        return res.status(400).json({ message: 'mediaType must be image or video' });
      }
      banner.mediaType = normalizedMediaType as any;
      if (normalizedMediaType === 'image' && banner.mediaUrl) {
        banner.image = banner.mediaUrl;
      }
    }
    if (linkUrl !== undefined) banner.linkUrl = linkUrl || undefined;
    if (type !== undefined) {
      const normalizedType = normalizeBannerType(type);
      if (type && !['flash_deal', 'product', 'swap_resale'].includes(normalizedType)) {
        return res.status(400).json({ message: 'type must be flash_deal, product, or swap_resale' });
      }
      banner.type = (normalizedType as any) || undefined;
    }
    if (redirectUrl !== undefined || type !== undefined) {
      banner.redirectUrl = resolveRedirectUrl(banner.type, redirectUrl || undefined);
    }
    if (ctaText !== undefined) banner.ctaText = ctaText || undefined;
    if (durationSeconds !== undefined) {
      banner.durationSeconds = Number.isFinite(Number(durationSeconds)) ? Number(durationSeconds) : undefined;
    }
    if (displayOrder !== undefined) {
      banner.displayOrder = Number.isFinite(Number(displayOrder)) ? Number(displayOrder) : 0;
    }
    if (isActive !== undefined) banner.isActive = Boolean(isActive);

    if (startAt !== undefined) {
      const parsedStartAt = parseOptionalDate(startAt);
      if (startAt && !parsedStartAt) {
        return res.status(400).json({ message: 'Invalid startAt date' });
      }
      banner.startAt = parsedStartAt || undefined;
    }
    if (endAt !== undefined) {
      const parsedEndAt = parseOptionalDate(endAt);
      if (endAt && !parsedEndAt) {
        return res.status(400).json({ message: 'Invalid endAt date' });
      }
      banner.endAt = parsedEndAt || undefined;
    }

    const updated = await bannerRepository.save(banner);
    res.json(updated);
  } catch (error: any) {
    console.error('[UPDATE AD BANNER] Error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Admin: delete banner
export const deleteAdBanner = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await bannerRepository.delete(id);
    if (!result.affected) {
      return res.status(404).json({ message: 'Ad banner not found' });
    }
    res.json({ message: 'Ad banner deleted successfully' });
  } catch (error) {
    console.error('[DELETE AD BANNER] Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
