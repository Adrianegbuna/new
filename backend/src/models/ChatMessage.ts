import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './User'

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true })
  userId: string | null

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User

  @Column({ type: 'varchar', length: 50 })
  role: 'user' | 'assistant' | 'human' // Who sent the message

  @Column({ type: 'text' })
  message: string // The actual message content

  @Column({ type: 'uuid', nullable: true })
  conversationId?: string | null

  @Column({ type: 'varchar', length: 20, default: 'web' })
  channel?: 'web' | 'whatsapp'

  @Column({ type: 'varchar', length: 100, nullable: true })
  sessionId?: string | null // For guest sessions (when userId is null)

  @Column({ type: 'varchar', length: 20, nullable: true })
  sentiment?: string // 'positive', 'negative', 'neutral'

  @Column({ type: 'varchar', length: 50, nullable: true })
  category?: string // 'product', 'order', 'installation', 'billing', etc.

  @Column({ type: 'json', nullable: true })
  context?: any // Store any additional context (product IDs, order IDs, etc.)

  @CreateDateColumn()
  createdAt: Date
}
