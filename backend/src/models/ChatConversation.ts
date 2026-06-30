import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('chat_conversations')
export class ChatConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid', nullable: true })
  userId: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  sessionId?: string | null

  @Column({ type: 'varchar', length: 20, default: 'human' })
  status: 'ai' | 'human'

  @Column({ type: 'varchar', length: 20, default: 'web' })
  channel: 'web' | 'whatsapp'

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
