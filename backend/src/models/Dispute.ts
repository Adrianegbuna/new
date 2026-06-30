import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';

export enum DisputeStatus {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

export enum DisputePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('disputes')
@Index(['buyerId', 'createdAt'])
@Index(['vendorId', 'createdAt'])
@Index(['status', 'createdAt'])
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  buyerId: string;

  @Column('uuid', { nullable: true })
  vendorId?: string;

  @Column('uuid', { nullable: true })
  orderId?: string;

  @Column({ length: 80, nullable: true })
  orderNumber?: string;

  @Column({ length: 140 })
  subject: string;

  @Column('text')
  description: string;

  @Column('simple-array', { nullable: true })
  evidenceUrls?: string[];

  @Column({
    type: 'enum',
    enum: DisputeStatus,
    default: DisputeStatus.OPEN,
  })
  status: DisputeStatus;

  @Column({
    type: 'enum',
    enum: DisputePriority,
    default: DisputePriority.MEDIUM,
  })
  priority: DisputePriority;

  @Column('text', { nullable: true })
  resolutionSummary?: string;

  @Column('uuid', { nullable: true })
  assignedAdminId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'buyerId' })
  buyer?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedAdminId' })
  assignedAdmin?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

