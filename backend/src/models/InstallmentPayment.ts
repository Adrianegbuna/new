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
import { Cheque } from './Cheque';

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIALLY_CLEARED = 'partially_cleared',
  FULLY_CLEARED = 'fully_cleared',
  CANCELLED = 'cancelled',
}

@Entity('installment_payments')
export class InstallmentPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column('uuid', { nullable: true })
  orderId: string | null;

  @Column('uuid', { nullable: true })
  applicationId: string | null;

  @Column('enum', { enum: ['3-month', '6-month'], default: '3-month' })
  paymentPlan: '3-month' | '6-month';

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  monthlyAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  paidAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  remainingBalance: number;

  @Column('int', { default: 0 })
  totalInstallments: number;

  @Column('int', { default: 0 })
  monthsRemaining: number;

  @Column('varchar', { length: 255, nullable: true })
  customerName: string | null;

  @Column('varchar', { length: 255, nullable: true })
  customerEmail: string | null;

  @Column('varchar', { length: 20, nullable: true })
  customerPhone: string | null;

  @Column('enum', { enum: ['pending', 'partially_cleared', 'fully_cleared', 'cancelled'], default: 'pending' })
  status: 'pending' | 'partially_cleared' | 'fully_cleared' | 'cancelled';

  @OneToMany(() => Cheque, (cheque) => cheque.installment, { cascade: true })
  cheques: Cheque[];

  @Column('text', { nullable: true })
  notes: string | null;

  @Column('varchar', { length: 50, nullable: true })
  referenceNumber: string | null;

  @Column('varchar', { length: 120, nullable: true })
  firstPaymentReference: string | null;

  @Column('boolean', { default: false })
  autoDebitEnabled: boolean;

  @Column('varchar', { length: 255, nullable: true })
  authorizationCode: string | null;

  @Column('varchar', { length: 255, nullable: true })
  authorizationEmail: string | null;

  @Column('timestamp', { nullable: true })
  debitStartAt: Date | null;

  @Column('timestamp', { nullable: true })
  nextDebitAt: Date | null;

  @Column('timestamp', { nullable: true })
  lastDebitAt: Date | null;

  @Column('varchar', { length: 120, nullable: true })
  lastDebitReference: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  cancelledAt: Date | null;
}
