import { AppDataSource } from '../config/database'
import { TradeIn, TradeInStatus } from '../models/TradeIn'
import { MoreThan } from 'typeorm'
import { Notification, NotificationType } from '../models/Notification'
import { User } from '../models/User'
import { emailService } from './emailService'

const tradeInRepository = AppDataSource.getRepository(TradeIn)
const notificationRepository = AppDataSource.getRepository(Notification)
const userRepository = AppDataSource.getRepository(User)

interface CreateTradeInDTO {
  userId: string
  productName: string
  description?: string
  interestedInProduct: string
  productCondition: string
  quantity: number
  estimatedPrice?: number
  inspectionFee: number
  deliveryOption: string
  images?: string[]
}

interface QuoteTradeInDTO {
  quotedPrice: number
  quotationNotes?: string
  quotedBy: string
}

export const tradeInService = {
  // Create new trade-in request
  async createTradeIn(data: CreateTradeInDTO) {
    try {
      if (Array.isArray(data.images) && data.images.length > 1) {
        throw new Error('Only one image is allowed per trade-in request')
      }

      // Add 10% markup to estimated price
      const markupPrice = data.estimatedPrice ? Number((data.estimatedPrice * 1.1).toFixed(2)) : 0
      
      const tradeIn = tradeInRepository.create({
        userId: data.userId,
        productName: data.productName,
        description: data.description,
        interestedInProduct: data.interestedInProduct,
        productCondition: data.productCondition as any,
        quantity: data.quantity,
        estimatedPrice: markupPrice,
        inspectionFee: data.inspectionFee,
        deliveryOption: data.deliveryOption as any,
        images: (data.images || []).slice(0, 1),
        status: TradeInStatus.PENDING
      })

      const savedTradeIn = await tradeInRepository.save(tradeIn)

      // Create notification for user
      const user = await userRepository.findOne({ where: { id: data.userId } })
      if (user) {
        await notificationRepository.save({
          userId: data.userId,
          type: NotificationType.TRADE_IN_SUBMITTED,
          title: 'Trade-In Request Submitted',
          message: `Your trade-in request for "${data.productName}" has been submitted. Admin will review and send you a quote. (Base price: ₦${data.estimatedPrice} + 10% markup = ₦${markupPrice})`,
          relatedEntityId: savedTradeIn.id,
          relatedEntityType: 'TradeIn'
        })

        // Send email to user
        try {
          await emailService.sendTradeInSubmissionEmail(user.email, user.firstName, data.productName)
        } catch (err) {
          console.warn('Failed to send trade-in submission email:', err)
        }
      }

      return savedTradeIn
    } catch (error) {
      throw error
    }
  },

  // Get approved trade-ins
  async getApprovedTradeIns(skip: number = 0, take: number = 20) {
    try {
      const [data, total] = await tradeInRepository.findAndCount({
        where: { status: TradeInStatus.APPROVED, quantity: MoreThan(0) },
        relations: ['user'],
        skip,
        take,
        order: { createdAt: 'DESC' }
      })
      
      // Transform data to include imageUrl from first image
      const transformedData = data.map(item => ({
        ...item,
        imageUrl: item.images && item.images.length > 0 ? item.images[0] : null,
        condition: item.productCondition,
        sellerName: item.user?.firstName || 'User',
        location: item.user?.city || 'Location not specified'
      }))
      
      return { data: transformedData, total }
    } catch (error) {
      throw error
    }
  },

  // Get user's trade-ins
  async getUserTradeIns(userId: string) {
    try {
      const tradeIns = await tradeInRepository.find({
        where: { userId },
        relations: ['user'],
        order: { createdAt: 'DESC' }
      })
      return tradeIns
    } catch (error) {
      throw error
    }
  },

  // Get single trade-in
  async getTradeInById(id: string) {
    try {
      const tradeIn = await tradeInRepository.findOne({
        where: { id },
        relations: ['user']
      })
      return tradeIn
    } catch (error) {
      throw error
    }
  },

  // Admin: Get all trade-ins (pending, quoted, approved, etc.)
  async getAllTradeIns(status?: TradeInStatus, skip: number = 0, take: number = 20) {
    try {
      const query = tradeInRepository.createQueryBuilder('tradein')
        .leftJoinAndSelect('tradein.user', 'user')
        .leftJoinAndSelect('tradein.originalOrder', 'originalOrder')

      if (status) {
        query.where('tradein.status = :status', { status })
      }

      const [data, total] = await query.skip(skip).take(take).orderBy('tradein.createdAt', 'DESC').getManyAndCount()

      return { data, total }
    } catch (error) {
      throw error
    }
  },

  // Admin: Send quote for trade-in
  async quoteTradeIn(tradeInId: string, data: QuoteTradeInDTO) {
    try {
      const tradeIn = await tradeInRepository.findOne({ where: { id: tradeInId }, relations: ['user'] })
      if (!tradeIn) throw new Error('Trade-in not found')

      tradeIn.quotedPrice = data.quotedPrice
      if (data.quotationNotes) {
        tradeIn.quotationNotes = data.quotationNotes
      }
      tradeIn.status = TradeInStatus.QUOTED
      tradeIn.quotedAt = new Date()
      tradeIn.quotedBy = data.quotedBy

      const updated = await tradeInRepository.save(tradeIn)

      // Create notification for user
      await notificationRepository.save({
        userId: tradeIn.userId,
        type: NotificationType.TRADE_IN_QUOTED,
        title: 'Trade-In Quote Received',
        message: `We have quoted ₦${data.quotedPrice.toLocaleString()} for your "${tradeIn.productName}". View details to accept or negotiate.`,
        relatedEntityId: tradeInId,
        relatedEntityType: 'TradeIn'
      })

      // Send email
      if (tradeIn.user) {
        try {
          await emailService.sendTradeInQuoteEmail(tradeIn.user.email, tradeIn.user.firstName, tradeIn.productName, data.quotedPrice)
        } catch (err) {
          console.warn('Failed to send quote email:', err)
        }
      }

      return updated
    } catch (error) {
      throw error
    }
  },

  // Admin: Approve trade-in
  async approveTradeIn(tradeInId: string, approvedBy: string) {
    try {
      const tradeIn = await tradeInRepository.findOne({ where: { id: tradeInId }, relations: ['user'] })
      if (!tradeIn) throw new Error('Trade-in not found')

      tradeIn.status = TradeInStatus.APPROVED
      tradeIn.approvedAt = new Date()
      tradeIn.approvedBy = approvedBy

      const updated = await tradeInRepository.save(tradeIn)

      // Create notification for user
      await notificationRepository.save({
        userId: tradeIn.userId,
        type: NotificationType.TRADE_IN_APPROVED,
        title: 'Trade-In Approved!',
        message: `Your trade-in for "${tradeIn.productName}" has been approved. Proceed to arrange inspection and delivery.`,
        relatedEntityId: tradeInId,
        relatedEntityType: 'TradeIn'
      })

      // Send email
      if (tradeIn.user) {
        try {
          await emailService.sendTradeInApprovedEmail(tradeIn.user.email, tradeIn.user.firstName, tradeIn.productName)
        } catch (err) {
          console.warn('Failed to send approval email:', err)
        }
      }

      return updated
    } catch (error) {
      throw error
    }
  },

  // Admin: Reject trade-in
  async rejectTradeIn(tradeInId: string, rejectionReason: string, approvedBy: string) {
    try {
      const tradeIn = await tradeInRepository.findOne({ where: { id: tradeInId }, relations: ['user'] })
      if (!tradeIn) throw new Error('Trade-in not found')

      tradeIn.status = TradeInStatus.REJECTED
      tradeIn.rejectionReason = rejectionReason
      tradeIn.approvedBy = approvedBy

      const updated = await tradeInRepository.save(tradeIn)

      // Create notification for user
      await notificationRepository.save({
        userId: tradeIn.userId,
        type: NotificationType.TRADE_IN_REJECTED,
        title: 'Trade-In Rejected',
        message: `Your trade-in request for "${tradeIn.productName}" was rejected. Reason: ${rejectionReason}`,
        relatedEntityId: tradeInId,
        relatedEntityType: 'TradeIn'
      })

      // Send email
      if (tradeIn.user) {
        try {
          await emailService.sendTradeInRejectedEmail(tradeIn.user.email, tradeIn.user.firstName, tradeIn.productName, rejectionReason)
        } catch (err) {
          console.warn('Failed to send rejection email:', err)
        }
      }

      return updated
    } catch (error) {
      throw error
    }
  },

  // Mark trade-in as completed
  async completeTradeIn(tradeInId: string) {
    try {
      const tradeIn = await tradeInRepository.findOne({ where: { id: tradeInId }, relations: ['user'] })
      if (!tradeIn) throw new Error('Trade-in not found')

      tradeIn.status = TradeInStatus.COMPLETED
      tradeIn.completedAt = new Date()

      const updated = await tradeInRepository.save(tradeIn)

      // Create notification for user
      await notificationRepository.save({
        userId: tradeIn.userId,
        type: NotificationType.TRADE_IN_APPROVED,
        title: 'Trade-In Completed',
        message: `Your trade-in for "${tradeIn.productName}" has been completed. Thank you!`,
        relatedEntityId: tradeInId,
        relatedEntityType: 'TradeIn'
      })

      return updated
    } catch (error) {
      throw error
    }
  },

  // User: Edit trade-in fields (including quantity for restock/repost)
  async editTradeIn(
    tradeInId: string,
    userId: string,
    updates: {
      productName?: string;
      description?: string;
      interestedInProduct?: string;
      productCondition?: string;
      inspectionFee?: number;
      estimatedPrice?: number;
      quantity?: number;
      deliveryOption?: string;
      images?: string[];
    }
  ) {
    try {
      const tradeIn = await tradeInRepository.findOne({ where: { id: tradeInId } })
      if (!tradeIn) throw new Error('Trade-in not found')
      if (tradeIn.userId !== userId) throw new Error('Unauthorized: You can only edit your own listings')

      if (typeof updates.productName === 'string' && updates.productName.trim()) {
        tradeIn.productName = updates.productName.trim()
      }

      if (typeof updates.description === 'string') {
        tradeIn.description = updates.description.trim()
      }

      if (typeof updates.interestedInProduct === 'string' && updates.interestedInProduct.trim()) {
        tradeIn.interestedInProduct = updates.interestedInProduct.trim()
      }

      if (updates.productCondition) {
        const allowed = ['Like New', 'Good', 'Fair', 'Poor']
        if (!allowed.includes(updates.productCondition)) {
          throw new Error('Invalid product condition')
        }
        tradeIn.productCondition = updates.productCondition as any
      }

      if (updates.inspectionFee !== undefined) {
        const fee = Number(updates.inspectionFee)
        if (!Number.isFinite(fee) || fee < 0) {
          throw new Error('Inspection fee must be a positive number')
        }
        tradeIn.inspectionFee = fee
      }

      // Update price if provided (add 10% markup on new base price)
      if (updates.estimatedPrice !== undefined) {
        const markupPrice = Number((updates.estimatedPrice * 1.1).toFixed(2))
        tradeIn.estimatedPrice = markupPrice
      }

      // Update delivery option if provided
      if (updates.deliveryOption) {
        if (!['pickup', 'delivery', 'both'].includes(updates.deliveryOption)) {
          throw new Error('Invalid delivery option')
        }
        tradeIn.deliveryOption = updates.deliveryOption as any
      }

      if (updates.quantity !== undefined) {
        const nextQty = Number(updates.quantity)
        if (!Number.isFinite(nextQty) || nextQty < 0) {
          throw new Error('Quantity cannot be negative')
        }
        tradeIn.quantity = Math.floor(nextQty)
      }

      if (updates.images !== undefined) {
        if (!Array.isArray(updates.images) || updates.images.length === 0) {
          throw new Error('At least one image is required')
        }
        if (updates.images.length > 1) {
          throw new Error('Only one image is allowed per trade-in request')
        }
        tradeIn.images = updates.images.slice(0, 1)
      }

      // Repost flow: move back to pending review when stock is restored on closed/rejected listings.
      if (
        tradeIn.quantity > 0 &&
        [TradeInStatus.REJECTED, TradeInStatus.CANCELLED, TradeInStatus.COMPLETED].includes(tradeIn.status)
      ) {
        tradeIn.status = TradeInStatus.PENDING
        tradeIn.rejectionReason = ''
        tradeIn.quotationNotes = ''
        tradeIn.quotedAt = null
        tradeIn.quotedBy = null
        tradeIn.approvedAt = null
        tradeIn.approvedBy = null
        tradeIn.completedAt = null
      }

      const updated = await tradeInRepository.save(tradeIn)
      return updated
    } catch (error) {
      throw error
    }
  },

  // User: Delete trade-in listing
  async deleteTradeIn(tradeInId: string, userId: string) {
    try {
      const tradeIn = await tradeInRepository.findOne({ where: { id: tradeInId } })
      if (!tradeIn) throw new Error('Trade-in not found')
      if (tradeIn.userId !== userId) throw new Error('Unauthorized: You can only delete your own listings')
      if (tradeIn.status === TradeInStatus.APPROVED) throw new Error('Cannot delete an approved trade-in')

      await tradeInRepository.remove(tradeIn)
      return { success: true, message: 'Trade-in listing deleted successfully' }
    } catch (error) {
      throw error
    }
  }
}
