import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from './Store';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., "Starter Backup", "Hybrid Smart Home", "Family Home Package"

  @Column({ type: 'varchar', nullable: true })
  panelRange: string | null; // e.g., "8-12", "none", "1-2", "3-5", "6-8"

  @Column('int')
  maxBatteryLithium: number; // Max quantity for lithium battery option

  @Column('int')
  maxBatteryTubular: number; // Max quantity for tubular battery option

  @Column({ type: 'varchar', default: 'standard' })
  inverterType: 'standard' | 'hybrid'; // standard or hybrid

  @Column({ default: true })
  installationKit: boolean; // Always true

  @Column('text', { default: '3 bedrooms, lights, fan, TV, decoder, phone charging' })
  powers: string; // Fixed powers description for all packages

  @Column('text', { default: 'Panels (10–25 yrs) • Inverter (1–2 yrs) • Battery — Lithium (3–5 yrs) / Tubular (1–2 yrs) • Installation kit (1 yr)' })
  warranty: string; // Fixed warranty for all packages

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  category: string | null; // e.g., "residential", "commercial", "office" for classification

  @Column({ type: 'varchar', nullable: true })
  vendorId: string | null; // If vendor is posting this package

  @Column({ type: 'uuid', nullable: true })
  storeId: string | null; // Store the package is linked to

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  vendorPrice: number | null; // Price set by vendor posting this package

  @Column({ type: 'int', default: 0 })
  quantity: number; // Available quantity for flash deals

  @Column({ type: 'text', nullable: true })
  image: string | null; // Featured image for flash deal display

  @Column({ type: 'simple-array', nullable: true })
  images: string[] | null; // Additional images for the package

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  featured: boolean;

  @ManyToOne(() => Store, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
