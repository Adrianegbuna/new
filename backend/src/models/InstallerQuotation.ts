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

export enum QuotationStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

@Entity('installer_quotations')
export class InstallerQuotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Installer who created the quotation
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'installerId' })
  installer: User;

  @Column()
  installerId: string;

  // Customer requesting the quotation
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Column({ nullable: true })
  customerId: string;

  // Quote details
  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  projectScope: string;

  @Column({ nullable: true })
  location: string;

  // Itemized costs stored as JSON
  @Column({ type: 'simple-json', nullable: true })
  itemizedCosts: Array<{
    description: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  // Validity period
  @Column({ type: 'date', nullable: true })
  validUntil: Date;

  @Column({ nullable: true })
  estimatedDuration: string; // e.g., "5 days", "2 weeks"

  @Column({
    type: 'enum',
    enum: QuotationStatus,
    default: QuotationStatus.DRAFT
  })
  status: QuotationStatus;

  // Reference to service package if created from package
  @Column({ nullable: true })
  servicePackageId: string;

  // Additional notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  terms: string; // Payment terms, warranty, etc.

  // Tracking
  @Column({ nullable: true })
  viewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
