import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAYMENT_COMPLETED = 'payment_completed'
}

@Entity('installment_applications')
export class InstallmentApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column()
  fullName!: string;

  @Column()
  email!: string;

  @Column()
  phone!: string;

  @Column('text')
  address!: string;

  @Column()
  employmentStatus!: string;

  @Column()
  monthlyIncome!: string;

  @Column({ nullable: true })
  organization?: string;

  @Column()
  bvn!: string;

  @Column({ type: 'jsonb', nullable: true })
  bvnData?: any;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  firstPayment!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  monthlyPayment!: number;

  @Column('int')
  months!: number;

  @Column('jsonb')
  cartItems!: any;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING
  })
  status!: ApplicationStatus;

  @Column({ nullable: true })
  adminNotes?: string;

  @Column({ nullable: true })
  approvedBy?: string;

  @Column({ nullable: true })
  approvedAt?: Date;

  @Column({ nullable: true })
  rejectedBy?: string;

  @Column({ nullable: true })
  rejectedAt?: Date;

  @Column({ nullable: true })
  paymentReference?: string;

  @Column({ nullable: true })
  paymentStatus?: string;

  @Column({ default: false })
  firstPaymentPaid!: boolean;

  @Column({ nullable: true })
  firstPaymentDate?: Date;

  @Column({ nullable: true })
  orderId?: string;

  @Column({ nullable: true })
  deliveryStatus?: string;

  @Column({ nullable: true })
  installationStatus?: string;

  @Column({ nullable: true })
  installedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
