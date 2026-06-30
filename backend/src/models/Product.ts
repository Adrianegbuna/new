import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Store } from './Store';
import { SubCategory } from './SubCategory';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  trackingId: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  originalPrice: number; // Original price before discount (for flash sales)

  @Column()
  image: string;

  @Column('simple-array', { nullable: true })
  images: string[]; // Additional product images

  @Column('simple-array', { nullable: true })
  videos: string[]; // Product videos

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  subcategory: string;

  @Column('int', { default: 0 })
  stock: number;

  @Column('simple-json', { nullable: true })
  specifications: Record<string, any>; // Product specs (e.g., { power: "100W", voltage: "12V", efficiency: "22%" })

  @Column('simple-json', { nullable: true })
  variantOptions?: Record<string, string[]>; // Example: { size: ["1kva","2kva"], color: ["black","white"] }

  @Column('simple-json', { nullable: true })
  variantSkus?: Array<{
    sku: string;
    options: Record<string, string>;
    price: number;
    stock: number;
  }>;

  @Column({ nullable: true })
  storeId: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ default: 'pending' })
  approvalStatus: string; // pending, approved, rejected

  @Column({ nullable: true })
  approvedBy: string; // Admin ID who approved

  @Column({ nullable: true })
  approvedAt: Date;

  // Admin posting fields
  @Column({ default: false })
  postedByAdmin: boolean;

  @Column({ nullable: true })
  adminPosterId: string; // Admin who posted the product

  @Column('simple-array', { nullable: true })
  availableCountries: string[]; // Countries where product is available

  // Ranking & Discovery System Columns
  @Column('int', { default: 0 })
  impressions: number; // How many times product was shown in feed

  @Column('int', { default: 0 })
  clicks: number; // How many times product was clicked from feed

  @Column('int', { default: 0 })
  purchases: number; // How many times product was purchased after viewing in feed

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  rankingScore: number; // Dynamic ranking score (0-100) for feed ordering

  @Column({ nullable: true })
  lastRankedAt: Date; // Last time ranking score was recalculated

  @Column('int', { default: 0 })
  rotationBoost: number; // Boost counter for low-impression products (0-2)

  @Column('int', { default: 0 })
  lowImpressionCounter: number; // Tracks days with low impressions for rotation boost

  @ManyToOne(() => Store, store => store.products, { nullable: true })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
