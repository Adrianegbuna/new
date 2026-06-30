import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Order } from './Order';

export enum ReferralStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending'
}

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrer_id' })
  referrer: User; // User who created the referral link

  @Column('uuid')
  referrerId: string;

  @Column('varchar', { length: 255, unique: true })
  referralCode: string; // Unique referral code

  @Column('text')
  referralLink: string; // Full referral link URL

  @Column('enum', { enum: ReferralStatus, default: ReferralStatus.ACTIVE })
  status: ReferralStatus;

  @Column('int', { default: 0 })
  totalReferred: number; // Total number of people who used this link

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  totalCommission: number; // Total commission earned (0.001% of purchases)

  @Column('int', { default: 0 })
  successfulPurchases: number; // Number of successful purchases via this link

  @OneToMany(() => ReferralClick, (click) => click.referral, { cascade: true })
  clicks: ReferralClick[];

  @OneToMany(() => ReferralPayout, (payout) => payout.referral, { cascade: true })
  payouts: ReferralPayout[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('referral_clicks')
export class ReferralClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Referral, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referral_id' })
  referral: Referral;

  @Column('uuid')
  referralId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referred_user_id' })
  referredUser: User; // User who clicked the link

  @Column('uuid', { nullable: true })
  referredUserId: string;

  @Column('varchar', { length: 255, nullable: true })
  sessionId: string;

  @Column('varchar', { length: 255, nullable: true })
  ipAddress: string;

  @Column('text', { nullable: true })
  userAgent: string;

  @Column('boolean', { default: false })
  convertedToPurchase: boolean; // Did this click result in a purchase?

  @CreateDateColumn()
  clickedAt: Date;
}

@Entity('referral_orders')
export class ReferralOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Referral, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referral_id' })
  referral: Referral;

  @Column('uuid')
  referralId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column('uuid')
  orderId: string;

  @Column('decimal', { precision: 15, scale: 2 })
  orderAmount: number; // Total order amount

  @Column('decimal', { precision: 15, scale: 4 })
  commissionRate: number; // Commission rate (0.001% = 0.00001 as decimal)

  @Column('decimal', { precision: 15, scale: 2 })
  commissionEarned: number; // Amount earned from this order (0.001% of orderAmount)

  @Column('enum', { enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('referral_payouts')
export class ReferralPayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Referral, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referral_id' })
  referral: Referral;

  @Column('uuid')
  referralId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid')
  userId: string;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number; // Amount to be paid out

  @Column('enum', { enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column('varchar', { length: 255, nullable: true })
  paymentMethod: string; // e.g., 'bank_transfer', 'wallet', 'paystack'

  @Column('text', { nullable: true })
  bankDetails?: string | null; // JSON string with bank account details

  @Column('text', { nullable: true })
  notes?: string | null; // Admin notes

  @Column('timestamp', { nullable: true })
  paidAt: Date; // When payment was processed

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
