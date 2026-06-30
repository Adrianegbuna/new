import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn
} from 'typeorm';
import { User } from './User';
import { InstallerQuotation } from './InstallerQuotation';
import { InstallerServicePackage } from './InstallerServicePackage';

export enum JobStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  COMPLETED = 'completed',
  REFUNDED = 'refunded'
}

@Entity('installer_jobs')
export class InstallerJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Installer performing the work
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'installerId' })
  installer: User;

  @Column()
  installerId: string;

  // Customer requesting the service
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Column()
  customerId: string;

  // Service details
  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  location: string;

  // Related quotation (optional - job can be created without formal quote)
  @ManyToOne(() => InstallerQuotation, { nullable: true })
  @JoinColumn({ name: 'quotationId' })
  quotation: InstallerQuotation;

  @Column({ nullable: true })
  quotationId: string;

  // Service package reference
  @ManyToOne(() => InstallerServicePackage, { nullable: true })
  @JoinColumn({ name: 'servicePackageId' })
  servicePackage: InstallerServicePackage;

  @Column({ nullable: true })
  servicePackageId: string;

  // Pricing
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  quotedAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  actualAmount: number; // Final amount if different from quote

  // Payment
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ nullable: true })
  paymentDueDate: Date;

  @Column({ nullable: true })
  paymentDate: Date;

  @Column({ nullable: true })
  paymentMethod: string; // credit_card, bank_transfer, cash, etc.

  // Status tracking
  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING
  })
  status: JobStatus;

  // Scheduling
  @Column({ nullable: true })
  scheduledStartDate: Date;

  @Column({ nullable: true })
  estimatedEndDate: Date;

  @Column({ nullable: true })
  actualStartDate: Date;

  @Column({ nullable: true })
  completionDate: Date;

  // Work details
  @Column({ type: 'text', nullable: true })
  workScope: string;

  @Column({ type: 'simple-json', nullable: true })
  milestones: Array<{
    title: string;
    description: string;
    targetDate: string;
    completed: boolean;
  }>;

  @Column({ type: 'simple-json', nullable: true })
  progressNotes: Array<{
    date: Date;
    note: string;
    attachments: string[];
  }>;

  @Column({ type: 'text', nullable: true })
  completionNotes: string;

  // Quality assurance
  @Column({ default: false })
  isQualityChecked: boolean;

  @Column({ nullable: true })
  qualityCheckDate: Date;

  @Column({ type: 'text', nullable: true })
  qualityCheckNotes: string;

  // Customer satisfaction
  @Column({ default: false })
  isCustomerSatisfied: boolean;

  @Column({ nullable: true })
  customerSignatureUrl: string;

  // Related data
  @Column({ type: 'simple-json', nullable: true })
  beforePhotos: string[]; // Before project photos (Cloudinary)

  @Column({ type: 'simple-json', nullable: true })
  afterPhotos: string[]; // After project photos (Cloudinary)

  @Column({ type: 'simple-json', nullable: true })
  documents: Array<{
    name: string;
    url: string;
    type: string; // invoice, receipt, certificate, etc.
  }>;

  // Warranty
  @Column({ nullable: true })
  warrantyStartDate: Date;

  @Column({ nullable: true })
  warrantyEndDate: Date;

  @Column({ type: 'text', nullable: true })
  warrantyTerms: string;

  // Cancellation info
  @Column({ nullable: true })
  cancellationReason: string;

  @Column({ nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true })
  cancelledBy: string; // customer or installer

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
