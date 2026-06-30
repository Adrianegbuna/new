import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';

@Entity('returns')
export class Return {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column('uuid')
  userId: string;

  @Column({ nullable: true })
  rmaNumber: string; // Return Merchandise Authorization

  @Column()
  reason: string; // Product defective, Changed mind, Wrong item, etc.

  @Column('text', { nullable: true })
  description: string;

  @Column('simple-array', { nullable: true })
  images: string[]; // Photos of the item being returned

  @Column({ default: 'requested' })
  status: string; // requested, approved, rejected, shipped, received, refunded, completed

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ default: false })
  refundProcessed: boolean;

  @Column({ nullable: true })
  returnedShippingLabel: string;

  @Column({ nullable: true })
  trackingNumber: string;

  @Column('text', { nullable: true })
  adminNotes: string;

  @Column({ nullable: true })
  approvedBy: string; // Admin ID

  @CreateDateColumn()
  requestedAt: Date;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  receivedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
