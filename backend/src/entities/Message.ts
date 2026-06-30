import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('messages')
@Index(['recipientId', 'createdAt'])
@Index(['senderId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  senderId: number;

  @Column()
  senderType: 'customer' | 'vendor' | 'installer';

  @Column()
  senderName: string;

  @Column()
  senderEmail: string;

  @Column()
  recipientId: number;

  @Column()
  recipientType: 'customer' | 'vendor' | 'installer';

  @Column({ nullable: true })
  subject: string;

  @Column('text')
  message: string;

  @Column({ nullable: true })
  projectType: string;

  @Column({ default: 'unread' })
  status: 'unread' | 'read' | 'replied';

  @Column('simple-json', { nullable: true })
  replies: Array<{
    id: string;
    senderId: number;
    senderType: 'customer' | 'vendor' | 'installer';
    senderName: string;
    message: string;
    createdAt: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;
}
