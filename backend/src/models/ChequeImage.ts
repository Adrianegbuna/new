import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Cheque } from './Cheque';

@Entity('cheque_images')
export class ChequeImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Cheque, (cheque) => cheque.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cheque_id' })
  cheque: Cheque;

  @Column('uuid')
  chequeId: string;

  @Column('text')
  imageUrl: string; // Cloudinary URL

  @Column('varchar', { length: 50, nullable: true })
  publicId: string; // Cloudinary public ID for deletion

  @CreateDateColumn()
  createdAt: Date;
}
