import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

// ============================================
// SERVICE REQUEST ENTITY
// ============================================
@Entity('service_requests')
@Index('idx_service_requests_user_id', ['userId'])
@Index('idx_service_requests_status', ['status'])
@Index('idx_service_requests_assigned_to', ['assignedTo'])
@Index('idx_service_requests_created_at', ['createdAt'])
@Index('idx_service_requests_user_status', ['userId', 'status'])
@Index('idx_service_requests_assigned_status', ['assignedTo', 'status'])
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'customer',
  })
  role: 'customer' | 'vendor' | 'installer';

  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  serviceType: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'assigned' | 'in_progress' | 'completed' | 'rejected';

  @Column({ type: 'uuid', nullable: true })
  assignedTo: string | null;

  @ManyToOne(() => User, { eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignedUser: User | null;

  @Column({ type: 'boolean', default: false })
  isPaid: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ServiceRequestUpdate, (update) => update.request, {
    cascade: true,
    eager: false,
  })
  updates: ServiceRequestUpdate[];

  @OneToMany(() => ServiceNotification, (notification) => notification.serviceRequest, {
    cascade: true,
    eager: false,
  })
  notifications: ServiceNotification[];
}

// ============================================
// SERVICE REQUEST UPDATE ENTITY (Audit Trail)
// ============================================
@Entity('service_request_updates')
@Index('idx_service_request_updates_request_id', ['requestId'])
@Index('idx_service_request_updates_updated_by', ['updatedBy'])
@Index('idx_service_request_updates_created_at', ['createdAt'])
export class ServiceRequestUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  requestId: string;

  @ManyToOne(() => ServiceRequest, (request) => request.updates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: ServiceRequest;

  @Column({ type: 'varchar', length: 50, nullable: true })
  oldStatus: string | null;

  @Column({ type: 'varchar', length: 50 })
  newStatus: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column('uuid')
  updatedBy: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: User;

  @CreateDateColumn()
  createdAt: Date;
}

// ============================================
// SERVICE NOTIFICATION ENTITY (for service requests)
// ============================================
@Entity('service_notifications')
@Index('idx_service_notifications_user_id', ['userId'])
@Index('idx_service_notifications_is_read', ['isRead'])
@Index('idx_service_notifications_created_at', ['createdAt'])
@Index('idx_service_notifications_user_unread', ['userId', 'isRead'])
@Index('idx_service_notifications_service_request_id', ['serviceRequestId'])
export class ServiceNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'uuid', nullable: true })
  serviceRequestId: string | null;

  @ManyToOne(() => ServiceRequest, (request) => request.notifications, {
    eager: false,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'service_request_id' })
  serviceRequest: ServiceRequest | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
