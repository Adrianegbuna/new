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

export enum ServiceType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  HYBRID = 'hybrid'
}

@Entity('installer_service_packages')
export class InstallerServicePackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Installer who created the package
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'installerId' })
  installer: User;

  @Column()
  installerId: string;

  // Package details
  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  // Service type
  @Column({
    type: 'enum',
    enum: ServiceType,
    default: ServiceType.RESIDENTIAL
  })
  serviceType: ServiceType;

  // Pricing
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  basePrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  discountPrice: number; // Optional discounted price

  @Column({ default: false })
  isCustomizable: boolean; // Whether customer can customize this package

  // Scope of work
  @Column({ type: 'text' })
  scopeOfWork: string;

  @Column({ type: 'simple-json', nullable: true })
  inclusions: string[]; // What's included in the package

  @Column({ type: 'simple-json', nullable: true })
  exclusions: string[]; // What's not included

  // Estimated details
  @Column({ nullable: true })
  estimatedDuration: string; // e.g., "3-5 days", "1 week"

  @Column({ nullable: true })
  estimatedWorkers: number; // Number of people working on the project

  // Warranty and support
  @Column({ nullable: true })
  warrantyPeriod: string; // e.g., "1 year", "2 years"

  @Column({ type: 'text', nullable: true })
  warrantyDetails: string;

  // Support/maintenance
  @Column({ default: false })
  includesInstallation: boolean;

  @Column({ default: false })
  includesMaintenance: boolean;

  @Column({ nullable: true })
  maintenancePeriod: string; // e.g., "6 months free maintenance"

  // Visibility and availability
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  isPublic: boolean; // Whether visible to customers

  // Statistics
  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  requestCount: number; // Number of times requested/inquired

  // Image/gallery
  @Column({ nullable: true })
  coverImage: string; // Cloudinary URL

  @Column({ type: 'simple-json', nullable: true })
  images: string[]; // Additional images

  // Tags for filtering
  @Column({ type: 'simple-json', nullable: true })
  tags: string[]; // e.g., ["solar", "battery", "installation"]

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
