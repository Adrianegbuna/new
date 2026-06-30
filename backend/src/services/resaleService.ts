import { AppDataSource } from '../config/database'
import { ResaleProduct, ResaleStatus } from '../models/ResaleProduct'
import { Notification, NotificationType } from '../models/Notification'
import { User } from '../models/User'
import { emailService } from './emailService'

const resaleRepository = AppDataSource.getRepository(ResaleProduct)
const notificationRepository = AppDataSource.getRepository(Notification)
const userRepository = AppDataSource.getRepository(User)

interface CreateResaleDTO {
  userId: string
  productName: string
  description?: string
  productCondition: string
  price: number
  quantity: number
  sellerRating: number
  inspectionFee: number
  deliveryOption: string
  images?: string[]
}

interface UpdateResaleStatusDTO {
  status: ResaleStatus
  rejectionReason?: string
  approvedBy: string
}

export const resaleService = {
  // Create new resale listing
  async createResale(data: CreateResaleDTO) {
    try {
      if (Array.isArray(data.images) && data.images.length > 1) {
        throw new Error('Only one image is allowed per resale listing')
      }

      // Add 10% markup to base price
      const markupPrice = Number((data.price * 1.1).toFixed(2))
      
      const resale = resaleRepository.create({
        userId: data.userId,
        productName: data.productName,
        description: data.description,
        productCondition: data.productCondition as any,
        price: markupPrice,
        quantity: data.quantity,
        sellerRating: data.sellerRating,
        inspectionFee: data.inspectionFee,
        deliveryOption: data.deliveryOption as any,
        images: (data.images || []).slice(0, 1),
        status: ResaleStatus.PENDING
      })

      const savedResale = await resaleRepository.save(resale)

      // Create notification for user
      const user = await userRepository.findOne({ where: { id: data.userId } })
      if (user) {
        await notificationRepository.save({
          userId: data.userId,
          type: NotificationType.RESALE_SUBMITTED,
          title: 'Resale Submitted for Review',
          message: `Your resale listing for "${data.productName}" has been submitted and is pending admin approval. (Base price: ₦${data.price} + 10% markup = ₦${markupPrice})`,
          relatedEntityId: savedResale.id,
          relatedEntityType: 'ResaleProduct'
        })

        // Send email to user
        try {
          await emailService.sendResaleSubmissionEmail(user.email, user.firstName, data.productName)
        } catch (err) {
          console.warn('Failed to send resale submission email:', err)
        }
      }

      return savedResale
    } catch (error) {
      throw error
    }
  },

  // Get approved resale listings with pagination
  async getApprovedResales(skip: number = 0, take: number = 20) {
    try {
      // Use INNER JOIN so orphaned listings (owner deleted) are never shown publicly.
      const [data, total] = await resaleRepository
        .createQueryBuilder('resale')
        .innerJoinAndSelect('resale.user', 'user')
        .where('resale.status = :status', { status: ResaleStatus.APPROVED })
        .andWhere('resale.quantity > 0')
        .orderBy('resale.createdAt', 'DESC')
        .skip(skip)
        .take(take)
        .getManyAndCount()
      
      // Transform data to include imageUrl from first image
      const transformedData = data.map(item => ({
        ...item,
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : null,
        condition: item.productCondition,
        sellerName: item.user?.firstName || 'Seller',
        location: item.user?.city || 'Location not specified'
      }))
      
      return { data: transformedData, total }
    } catch (error) {
      throw error
    }
  },

  // Get user's resales
  async getUserResales(userId: string) {
    try {
      const resales = await resaleRepository.find({
        where: { userId },
        relations: ['user'],
        order: { createdAt: 'DESC' }
      })
      return resales
    } catch (error) {
      throw error
    }
  },

  // Get single resale (for details page)
  async getResaleById(id: string) {
    try {
      const resale = await resaleRepository.findOne({
        where: { id },
        relations: ['user']
      })
      return resale
    } catch (error) {
      throw error
    }
  },

  // Admin: Get all resales (pending, approved, rejected)
  async getAllResales(status?: ResaleStatus, skip: number = 0, take: number = 20) {
    try {
      const query = resaleRepository.createQueryBuilder('resale')
        .leftJoinAndSelect('resale.user', 'user')
        .leftJoinAndSelect('resale.originalOrder', 'originalOrder')

      if (status) {
        query.where('resale.status = :status', { status })
      }

      const [data, total] = await query.skip(skip).take(take).orderBy('resale.createdAt', 'DESC').getManyAndCount()

      return { data, total }
    } catch (error) {
      throw error
    }
  },

  // Admin: Approve resale
  async approveResale(resaleId: string, approvedBy: string) {
    try {
      const resale = await resaleRepository.findOne({ where: { id: resaleId }, relations: ['user'] })
      if (!resale) throw new Error('Resale not found')

      resale.status = ResaleStatus.APPROVED
      resale.approvedAt = new Date()
      resale.approvedBy = approvedBy

      const updated = await resaleRepository.save(resale)

      // Create notification for user
      await notificationRepository.save({
        userId: resale.userId,
        type: NotificationType.RESALE_APPROVED,
        title: 'Resale Approved!',
        message: `Your resale listing for "${resale.productName}" has been approved and is now visible to buyers.`,
        relatedEntityId: resaleId,
        relatedEntityType: 'ResaleProduct'
      })

      // Send email
      if (resale.user) {
        try {
          await emailService.sendResaleApprovedEmail(resale.user.email, resale.user.firstName, resale.productName)
        } catch (err) {
          console.warn('Failed to send approval email:', err)
        }
      }

      return updated
    } catch (error) {
      throw error
    }
  },

  // Admin: Reject resale
  async rejectResale(resaleId: string, rejectionReason: string, approvedBy: string) {
    try {
      const resale = await resaleRepository.findOne({ where: { id: resaleId }, relations: ['user'] })
      if (!resale) throw new Error('Resale not found')

      resale.status = ResaleStatus.REJECTED
      resale.rejectionReason = rejectionReason
      resale.approvedBy = approvedBy

      const updated = await resaleRepository.save(resale)

      // Create notification for user
      await notificationRepository.save({
        userId: resale.userId,
        type: NotificationType.RESALE_REJECTED,
        title: 'Resale Rejected',
        message: `Your resale listing for "${resale.productName}" was rejected. Reason: ${rejectionReason}`,
        relatedEntityId: resaleId,
        relatedEntityType: 'ResaleProduct'
      })

      // Send email
      if (resale.user) {
        try {
          await emailService.sendResaleRejectedEmail(resale.user.email, resale.user.firstName, resale.productName, rejectionReason)
        } catch (err) {
          console.warn('Failed to send rejection email:', err)
        }
      }

      return updated
    } catch (error) {
      throw error
    }
  },

  // User: Edit resale fields (including quantity for restock/repost)
  async editResale(
    resaleId: string,
    userId: string,
    updates: {
      productName?: string;
      description?: string;
      productCondition?: string;
      inspectionFee?: number;
      price?: number;
      quantity?: number;
      deliveryOption?: string;
      images?: string[];
    }
  ) {
    try {
      const resale = await resaleRepository.findOne({ where: { id: resaleId } })
      if (!resale) throw new Error('Resale not found')
      if (resale.userId !== userId) throw new Error('Unauthorized: You can only edit your own listings')

      if (typeof updates.productName === 'string' && updates.productName.trim()) {
        resale.productName = updates.productName.trim()
      }

      if (typeof updates.description === 'string') {
        resale.description = updates.description.trim()
      }

      if (updates.productCondition) {
        const allowed = ['Like New', 'Good', 'Fair', 'Poor']
        if (!allowed.includes(updates.productCondition)) {
          throw new Error('Invalid product condition')
        }
        resale.productCondition = updates.productCondition as any
      }

      if (updates.inspectionFee !== undefined) {
        const fee = Number(updates.inspectionFee)
        if (!Number.isFinite(fee) || fee < 0) {
          throw new Error('Inspection fee must be a positive number')
        }
        resale.inspectionFee = fee
      }

      // Update price if provided (add 10% markup on new base price)
      if (updates.price !== undefined) {
        const markupPrice = Number((updates.price * 1.1).toFixed(2))
        resale.price = markupPrice
      }

      // Update delivery option if provided
      if (updates.deliveryOption) {
        if (!['pickup', 'delivery', 'both'].includes(updates.deliveryOption)) {
          throw new Error('Invalid delivery option')
        }
        resale.deliveryOption = updates.deliveryOption as any
      }

      if (updates.quantity !== undefined) {
        const nextQty = Number(updates.quantity)
        if (!Number.isFinite(nextQty) || nextQty < 0) {
          throw new Error('Quantity cannot be negative')
        }
        resale.quantity = Math.floor(nextQty)
      }

      if (updates.images !== undefined) {
        if (!Array.isArray(updates.images) || updates.images.length === 0) {
          throw new Error('At least one image is required')
        }
        if (updates.images.length > 1) {
          throw new Error('Only one image is allowed per resale listing')
        }
        resale.images = updates.images.slice(0, 1)
      }

      // If owner updates a rejected/cancelled/sold listing with stock, move back to review queue.
      if (
        resale.quantity > 0 &&
        [ResaleStatus.REJECTED, ResaleStatus.CANCELLED, ResaleStatus.SOLD].includes(resale.status)
      ) {
        resale.status = ResaleStatus.PENDING
        resale.rejectionReason = ''
        resale.approvedAt = null
        resale.approvedBy = null
      }

      const updated = await resaleRepository.save(resale)
      return updated
    } catch (error) {
      throw error
    }
  },

  // User: Delete resale listing
  async deleteResale(resaleId: string, userId: string) {
    try {
      const resale = await resaleRepository.findOne({ where: { id: resaleId } })
      if (!resale) throw new Error('Resale not found')
      if (resale.userId !== userId) throw new Error('Unauthorized: You can only delete your own listings')
      if (resale.status === ResaleStatus.SOLD) throw new Error('Cannot delete a sold item')

      await resaleRepository.remove(resale)
      return { success: true, message: 'Resale listing deleted successfully' }
    } catch (error) {
      throw error
    }
  }
}
