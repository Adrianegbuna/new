import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum NotificationType {
  ORDER = 'order',
  PAYMENT = 'payment',
  JOB = 'job',
  REVIEW = 'review',
  MESSAGE = 'message',
  INSTALLMENT = 'installment',
  PRODUCT = 'product',
  VENDOR = 'vendor',
  INSTALLER = 'installer',
  RESALE_SUBMITTED = 'resale_submitted',
  RESALE_APPROVED = 'resale_approved',
  RESALE_REJECTED = 'resale_rejected',
  TRADE_IN_SUBMITTED = 'trade_in_submitted',
  TRADE_IN_QUOTED = 'trade_in_quoted',
  TRADE_IN_APPROVED = 'trade_in_approved',
  TRADE_IN_REJECTED = 'trade_in_rejected',
  GENERAL = 'general'
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.GENERAL })
  type: NotificationType;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text')
  message: string;

  @Column('uuid', { nullable: true })
  relatedId?: string;

  @Column('varchar', { length: 500, nullable: true })
  actionUrl?: string;

  @Column({ default: false })
  read: boolean;

  @Column({ default: false })
  deleted: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;
}
