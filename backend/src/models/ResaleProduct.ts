import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './User'
import { Order } from './Order'

export enum ProductCondition {
  LIKE_NEW = 'Like New',
  GOOD = 'Good',
  FAIR = 'Fair',
  POOR = 'Poor'
}

export enum ResaleStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SOLD = 'sold',
  CANCELLED = 'cancelled'
}

export enum DeliveryOption {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  BOTH = 'both'
}

@Entity('resale_products')
export class ResaleProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'varchar', length: 255 })
  productName: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ type: 'enum', enum: ProductCondition })
  productCondition: ProductCondition

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: number

  @Column({ type: 'int', default: 1 })
  quantity: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  sellerRating: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  inspectionFee: number

  @Column({ type: 'enum', enum: DeliveryOption })
  deliveryOption: DeliveryOption

  @Column({ type: 'simple-array', nullable: true })
  images: string[]

  @Column({ type: 'enum', enum: ResaleStatus, default: ResaleStatus.PENDING })
  status: ResaleStatus

  @Column({ type: 'text', nullable: true })
  rejectionReason: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string | null

  @Column({ type: 'uuid', nullable: true })
  originalOrderId: string

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'originalOrderId' })
  originalOrder: Order | null
}
