import { AppDataSource } from '../config/database';
import { PayoutRequest, PayoutStatus, UserType } from '../models/PayoutRequest';
import { User } from '../models/User';

export class PayoutRequestService {
  private get payoutRepo() {
    return AppDataSource.getRepository(PayoutRequest);
  }

  private get userRepo() {
    return AppDataSource.getRepository(User);
  }

  async createPayoutRequest(
    userId: string,
    bankName: string,
    accountNumber: string,
    accountHolderName: string,
    requestedAmount: number,
    bankCode?: string
  ) {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });

    // Validate amount
    if (requestedAmount <= 0) {
      throw new Error('Payout amount must be greater than 0');
    }

    // Validate account details
    if (!bankName || !accountNumber || !accountHolderName) {
      throw new Error('All account details are required');
    }

    // Determine user type based on role
    let userType: UserType;
    switch (user.role) {
      case 'vendor':
        userType = UserType.VENDOR;
        break;
      case 'installer':
        userType = UserType.INSTALLER;
        break;
      default:
        userType = UserType.CUSTOMER;
    }

    const payoutRequest = this.payoutRepo.create({
      userId,
      userType,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: '',
      postalCode: '',
      bankName,
      accountNumber,
      accountHolderName,
      bankCode,
      requestedAmount,
      status: PayoutStatus.PENDING,
    });

    return await this.payoutRepo.save(payoutRequest);
  }

  async getAllPayoutRequests(
    userType?: UserType,
    status?: PayoutStatus,
    page: number = 1,
    limit: number = 20
  ) {
    const query = this.payoutRepo.createQueryBuilder('payout');

    if (userType) {
      query.andWhere('payout.userType = :userType', { userType });
    }

    if (status) {
      query.andWhere('payout.status = :status', { status });
    }

    query.orderBy('payout.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    const [data, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPayoutRequestById(id: string) {
    return await this.payoutRepo.findOneOrFail({ where: { id } });
  }

  async getUserPayoutRequests(userId: string) {
    return await this.payoutRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async approvePayoutRequest(
    id: string,
    adminNotes?: string
  ) {
    const payoutRequest = await this.payoutRepo.findOneOrFail({ where: { id } });

    if (payoutRequest.status !== PayoutStatus.PENDING) {
      throw new Error(`Cannot approve request with status: ${payoutRequest.status}`);
    }

    payoutRequest.status = PayoutStatus.APPROVED;
    if (adminNotes) {
      payoutRequest.adminNotes = adminNotes;
    }
    payoutRequest.processedAt = new Date();

    return await this.payoutRepo.save(payoutRequest);
  }

  async rejectPayoutRequest(
    id: string,
    rejectionReason: string
  ) {
    const payoutRequest = await this.payoutRepo.findOneOrFail({ where: { id } });

    if (payoutRequest.status !== PayoutStatus.PENDING) {
      throw new Error(`Cannot reject request with status: ${payoutRequest.status}`);
    }

    if (!rejectionReason) {
      throw new Error('Rejection reason is required');
    }

    payoutRequest.status = PayoutStatus.REJECTED;
    payoutRequest.rejectionReason = rejectionReason;
    payoutRequest.processedAt = new Date();

    return await this.payoutRepo.save(payoutRequest);
  }

  async markAsProcessing(id: string) {
    const payoutRequest = await this.payoutRepo.findOneOrFail({ where: { id } });

    if (payoutRequest.status !== PayoutStatus.APPROVED) {
      throw new Error('Only approved requests can be marked as processing');
    }

    payoutRequest.status = PayoutStatus.PROCESSING;
    return await this.payoutRepo.save(payoutRequest);
  }

  async markAsCompleted(
    id: string,
    transactionReference: string
  ) {
    const payoutRequest = await this.payoutRepo.findOneOrFail({ where: { id } });

    if (payoutRequest.status !== PayoutStatus.PROCESSING) {
      throw new Error('Only processing requests can be marked as completed');
    }

    payoutRequest.status = PayoutStatus.COMPLETED;
    payoutRequest.transactionReference = transactionReference;
    payoutRequest.processedAt = new Date();

    return await this.payoutRepo.save(payoutRequest);
  }

  async cancelPayoutRequest(id: string) {
    const payoutRequest = await this.payoutRepo.findOneOrFail({ where: { id } });

    if (![PayoutStatus.PENDING, PayoutStatus.APPROVED].includes(payoutRequest.status)) {
      throw new Error(`Cannot cancel request with status: ${payoutRequest.status}`);
    }

    payoutRequest.status = PayoutStatus.CANCELLED;
    return await this.payoutRepo.save(payoutRequest);
  }

  async getPayoutStats() {
    const stats = {
      totalPending: await this.payoutRepo.count({
        where: { status: PayoutStatus.PENDING },
      }),
      totalApproved: await this.payoutRepo.count({
        where: { status: PayoutStatus.APPROVED },
      }),
      totalProcessing: await this.payoutRepo.count({
        where: { status: PayoutStatus.PROCESSING },
      }),
      totalCompleted: await this.payoutRepo.count({
        where: { status: PayoutStatus.COMPLETED },
      }),
      totalAmount: 0 as number,
    };

    const result = await this.payoutRepo
      .createQueryBuilder('p')
      .select('SUM(p.requestedAmount)', 'total')
      .where('p.status IN (:...statuses)', {
        statuses: [PayoutStatus.PENDING, PayoutStatus.APPROVED, PayoutStatus.PROCESSING],
      })
      .getRawOne();

    stats.totalAmount = result?.total || 0;

    return stats;
  }
}

export const payoutRequestService = new PayoutRequestService();
