import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Product } from './Product';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  rating: number;

  @Column('text')
  comment: string;

  @Column({ nullable: true })
  reviewType: string; // 'product', 'store', 'installer'

  @Column({ nullable: true })
  targetId: string; // ID of product, store, or installer

  @ManyToOne(() => User, { nullable: true })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userName: string;

  @CreateDateColumn()
  createdAt: Date;
}
