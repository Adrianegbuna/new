import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';

@Entity('admin_audit_logs')
@Index(['actorUserId', 'createdAt'])
@Index(['action', 'createdAt'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  actorUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actorUserId' })
  actor?: User;

  @Column({ length: 120 })
  action: string;

  @Column({ length: 120, nullable: true })
  targetType?: string;

  @Column({ length: 120, nullable: true })
  targetId?: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ length: 64, nullable: true })
  ipAddress?: string;

  @Column({ length: 255, nullable: true })
  userAgent?: string;

  @Column({ type: 'int', nullable: true })
  statusCode?: number;

  @CreateDateColumn()
  createdAt: Date;
}

