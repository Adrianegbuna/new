import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum InquiryStatus {
  UNREAD = 'unread',
  READ = 'read',
  REPLIED = 'replied',
}

export enum SenderType {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  INSTALLER = 'installer',
}

@Entity('site_inquiries')
export class SiteInquiry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  senderName: string;

  @Column()
  senderEmail: string;

  @Column()
  senderPhone: string;

  @Column({
    type: 'enum',
    enum: SenderType,
    default: SenderType.CUSTOMER,
  })
  senderType: SenderType;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ nullable: true })
  projectType: string;

  @Column({
    type: 'enum',
    enum: InquiryStatus,
    default: InquiryStatus.UNREAD,
  })
  status: InquiryStatus;

  @Column({ nullable: true, type: 'text' })
  adminReply: string;

  @Column({ nullable: true })
  repliedBy: string; // Admin ID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
