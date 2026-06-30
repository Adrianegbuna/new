import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type AdMediaType = 'image' | 'video';
export type AdBannerType = 'flash_deal' | 'product' | 'swap_resale';

@Entity('ad_banners')
export class AdBanner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  mediaUrl: string;

  @Column({ type: 'varchar', length: 20 })
  mediaType: AdMediaType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  linkUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  redirectUrl?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type?: AdBannerType;

  @Column({ type: 'text', nullable: true })
  image?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ctaText?: string;

  @Column({ type: 'int', nullable: true })
  durationSeconds?: number;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
