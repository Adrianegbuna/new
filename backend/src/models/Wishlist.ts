import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './User';

@Entity('wishlists')
@Unique(['userId', 'productId'])
export class Wishlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  productId: string;

  @Column({ nullable: true })
  productName: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  productPrice: number;

  @Column({ nullable: true })
  productImage: string;

  @Column({ nullable: true })
  productCategory: string;

  @Column({ default: false })
  notifyOnPriceDrop: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  priceBoughtAt: number;

  @Column({ default: false })
  notifyOnStockUpdate: boolean;

  @CreateDateColumn()
  addedAt: Date;

  @Column({ nullable: true })
  notesFromUser: string;
}
