import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './User'
import { Order } from './Order'
import { ProductCondition, DeliveryOption } from './ResaleProduct'

export enum TradeInStatus {
  PENDING = 'pending',
  QUOTED = 'quoted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity('trade_ins')
export class TradeIn {
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

  @Column({ type: 'varchar', length: 255 })
  interestedInProduct: string

  @Column({ type: 'enum', enum: ProductCondition })
  productCondition: ProductCondition

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedPrice: number | null

  @Column({ type: 'int', default: 1 })
  quantity: number

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  quotedPrice: number | null

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  inspectionFee: number

  @Column({ type: 'enum', enum: DeliveryOption })
  deliveryOption: DeliveryOption

  @Column({ type: 'simple-array', nullable: true })
  images: string[]

  @Column({ type: 'enum', enum: TradeInStatus, default: TradeInStatus.PENDING })
  status: TradeInStatus

  @Column({ type: 'text', nullable: true })
  rejectionReason: string

  @Column({ type: 'text', nullable: true })
  quotationNotes: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ type: 'timestamp', nullable: true })
  quotedAt: Date | null

  @Column({ type: 'uuid', nullable: true })
  quotedBy: string | null

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string | null

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null

  @Column({ type: 'uuid', nullable: true })
  originalOrderId: string

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'originalOrderId' })
  originalOrder: Order | null
}
