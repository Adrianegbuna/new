import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Store } from './Store';

@Entity('store_payout_requests')
export class StorePayoutRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  storeId: string;

  @Column()
  userId: string;

  @ManyToOne(() => Store, { eager: true })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column('text')
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

  @Column('text', { default: 'bank_transfer' })
  paymentMethod: string; // bank_transfer, paystack, wallet

  @Column('text', { nullable: true })
  bankDetails: string; // JSON string with bank account details

  @Column('text', { nullable: true })
  notes?: string; // Admin notes

  @Column('text', { nullable: true })
  rejectionReason?: string; // Reason for rejection

  @Column('timestamp', { nullable: true })
  approvedAt?: Date; // When approved by admin

  @Column('timestamp', { nullable: true })
  paidAt?: Date; // When payment was processed

  @Column('text', { nullable: true })
  transactionReference?: string; // Payment reference

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
