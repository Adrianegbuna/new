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

@Entity('user_addresses')
@Index(['userId', 'isDefault'])
export class UserAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ length: 40, nullable: true })
  label?: string;

  @Column({ length: 120 })
  recipientName: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ length: 200 })
  street: string;

  @Column({ length: 120 })
  city: string;

  @Column({ length: 120, nullable: true })
  state?: string;

  @Column({ length: 120, nullable: true })
  country?: string;

  @Column({ length: 40, nullable: true })
  postalCode?: string;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

