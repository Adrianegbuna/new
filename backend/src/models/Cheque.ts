import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { InstallmentPayment } from './InstallmentPayment';
import { ChequeImage } from './ChequeImage';

export enum ChequeStatus {
  PENDING = 'pending',
  CLEARED = 'cleared',
  BOUNCED = 'bounced',
  CANCELLED = 'cancelled',
}

@Entity('cheques')
export class Cheque {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InstallmentPayment, (installment) => installment.cheques, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'installment_id' })
  installment: InstallmentPayment;

  @Column('uuid')
  installmentId: string;

  @Column('varchar', { length: 50 })
  chequeId: string; // Cheque number

  @Column('date')
  issueDate: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { length: 100, nullable: true })
  bankName: string;

  @Column('varchar', { length: 50, nullable: true })
  accountNumber: string;

  @Column('enum', { enum: ['pending', 'cleared', 'bounced', 'cancelled'], default: 'pending' })
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';

  @Column('timestamp', { nullable: true })
  clearedDate: Date | null;

  @Column('text', { nullable: true })
  adminNotes: string;

  @OneToMany(() => ChequeImage, (image) => image.cheque, { cascade: true })
  images: ChequeImage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
