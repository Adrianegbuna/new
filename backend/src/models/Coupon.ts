import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  discountPercentage: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  discountAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  minimumOrderAmount: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maximumDiscount: number;

  @Column({ default: 'active' })
  status: string; // active, expired, disabled

  @Column()
  expiryDate: Date;

  @Column('int', { default: 0 })
  usageLimit: number; // 0 = unlimited

  @Column('int', { default: 0 })
  timesUsed: number;

  @Column('simple-array', { nullable: true })
  applicableCategories: string[]; // If empty, applies to all

  @Column('simple-array', { nullable: true })
  applicableVendors: string[]; // If empty, applies to all

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string; // Admin ID
}
