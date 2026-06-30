import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Order } from './Order';

export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  INSTALLER = 'installer',
  ADMIN = 'admin',
}

export enum AdminLevel {
  SA00 = 'SA00', // Super Admin - Highest level
  SA10 = 'SA10', // Assistant Admin
  SA20 = 'SA20', // Normal Admin
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  dateOfBirth: string;

  @Column({ nullable: true })
  gender: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  // Admin level (only for admin users)
  @Column({
    type: 'enum',
    enum: AdminLevel,
    nullable: true,
  })
  adminLevel: AdminLevel;

  // Vendor fields
  @Column({ nullable: true })
  businessName: string;

  @Column({ nullable: true, unique: true })
  businessRegNumber: string;

  // Installer fields
  @Column({ nullable: true })
  certifications: string;

  @Column({ nullable: true })
  yearsOfExperience: string;

  @Column({ nullable: true })
  serviceAreas: string;

  @Column({ nullable: true })
  profilePhoto: string;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({ nullable: true })
  specialties: string;

  @Column({ nullable: true })
  accountType: string;

  @Column({ default: false })
  interestedInPaySmallSmall: boolean;

  // Vendor verification fields
  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verifiedBy: string; // Admin ID who verified

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @Column({ default: 'pending' }) // pending, approved, rejected
  verificationStatus: string;

  @Column({ type: 'text', nullable: true })
  verificationNotes: string;

  // Bank account fields (for payouts)
  @Column({ nullable: true })
  bankAccountName: string;

  @Column({ nullable: true })
  bankAccountNumber: string;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankCode: string;

  @Column({ nullable: true })
  bankCountry: string;

  // Referral fields
  @Column({ nullable: true, unique: true })
  referralCode: string; // Unique referral code for earning commissions

  @Column({ nullable: true })
  profilePhotoUrl?: string;

  @Column({ nullable: true })
  profilePhotoKey?: string;

  // Password reset fields
  @Column({ nullable: true })
  resetToken?: string;

  @Column({ nullable: true })
  resetTokenExpiry?: Date;

  // MFA fields
  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  mfaSecret?: string | null;

  @Column('simple-array', { nullable: true })
  mfaBackupCodes?: string[];

  @Column({ type: 'timestamp', nullable: true })
  mfaEnabledAt?: Date | null;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
