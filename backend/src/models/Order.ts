import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar', { length: 50, nullable: true })
  orderNumber: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('jsonb', { nullable: true })
  buyer: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
  };

  @Column('jsonb', { nullable: true })
  store: {
    id: string;
    name: string;
    location: string;
    city?: string;
    email: string;
    phone: string;
  };

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  totalPrice: number;

  @Column('jsonb')
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image?: string;
    vendorId?: string;
    storeId?: string;
    storeName?: string;
    storeCity?: string;
    isSwapItem?: boolean;
    swapItemType?: 'resale' | 'tradein';
    originalSellerId?: string;
    isFlashDeal?: boolean;
    packageType?: string;
    packageId?: string;
  }>;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column('jsonb', { nullable: true })
  buyerDetails: {
    name: string;
    email: string;
    phone: string;
  };

  @Column({ nullable: true })
  markedForDelivery: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending',
  })
  orderStatus: string; // Single source of truth: pending, processing, shipped, delivered, cancelled

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ nullable: true, unique: true })
  paymentReference: string;

  @Column({ nullable: true, unique: true })
  paystackReference: string;

  @Column('jsonb', { nullable: true })
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ nullable: true })
  carrier: string;

  @Column({ type: 'date', nullable: true })
  estimatedDelivery: Date;

  @Column('jsonb', { nullable: true })
  trackingHistory: Array<{
    status: string;
    description: string;
    timestamp: Date;
    location?: string;
  }>;

  @Column({ type: 'timestamp', nullable: true, name: 'shipped_at' })
  shippedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
  deliveredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
