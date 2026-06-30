import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { AppDataSource } from '../config/database'
import { ChatMessage } from '../models/ChatMessage'
import { ChatConversation } from '../models/ChatConversation'
import { Repository } from 'typeorm'
import { emailService } from './emailService'
import { NotificationService } from './notificationService'
import { NotificationType } from '../models/Notification'
import { User, UserRole } from '../models/User'
import { getIO } from '../socket'

// Initialize AI clients
const anthropicKey = process.env.ANTHROPIC_API_KEY
const openaiKey = process.env.OPENAI_API_KEY
const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null

interface MessageParam {
  role: 'user' | 'assistant'
  content: string
}

interface ChatContext {
  userId: string
  category?: string
  product?: any
  orderId?: string
  installerId?: string
}

export class ChatService {
  private chatRepository: Repository<ChatMessage> = AppDataSource.getRepository(ChatMessage)
  private conversationRepository: Repository<ChatConversation> = AppDataSource.getRepository(ChatConversation)

  /**
   * Search for products using natural language query
   * Searches product names, descriptions, and categories
   */
  async searchProducts(query: string, limit: number = 4): Promise<any[]> {
    try {
      // Use Meilisearch or database search
      // For now, return empty array - backend team can integrate actual search
      const products = await AppDataSource.query(`
        SELECT id, name, description, price, category, image_url, rating, store_id
        FROM product
        WHERE 
          LOWER(name) LIKE LOWER($1) OR
          LOWER(description) LIKE LOWER($1) OR
          LOWER(category) LIKE LOWER($1)
        LIMIT $2
      `, [`%${query}%`, limit])
      
      return products || []
    } catch (error) {
      console.error('Product search error:', error)
      return []
    }
  }

  /**
   * Search for resale/swap items using natural language query
   */
  async searchResaleItems(query: string, limit: number = 4): Promise<any[]> {
    try {
      const resaleItems = await AppDataSource.query(`
        SELECT id, title, description, price, condition, category, image_url, seller_name, created_at
        FROM resale
        WHERE status = 'approved'
        AND (
          LOWER(title) LIKE LOWER($1) OR
          LOWER(description) LIKE LOWER($1) OR
          LOWER(category) LIKE LOWER($1)
        )
        LIMIT $2
      `, [`%${query}%`, limit])
      
      return resaleItems || []
    } catch (error) {
      console.error('Resale search error:', error)
      return []
    }
  }

  /**
   * Search for trade-in items
   */
  async searchTradeInItems(query: string, limit: number = 4): Promise<any[]> {
    try {
      const tradeInItems = await AppDataSource.query(`
        SELECT id, title, description, condition, category, image_url, seller_name, created_at
        FROM "trade_in"
        WHERE status = 'approved'
        AND (
          LOWER(title) LIKE LOWER($1) OR
          LOWER(description) LIKE LOWER($1) OR
          LOWER(category) LIKE LOWER($1)
        )
        LIMIT $2
      `, [`%${query}%`, limit])
      
      return tradeInItems || []
    } catch (error) {
      console.error('Trade-in search error:', error)
      return []
    }
  }

  /**
   * Search for installers by location or specialty
   */
  async searchInstallers(query: string, limit: number = 3): Promise<any[]> {
    try {
      const installers = await AppDataSource.query(`
        SELECT DISTINCT 
          u.id, u.first_name, u.last_name, u.email, 
          ip.bio, ip.experience_years, ip.service_areas, 
          ip.profile_image, ip.availability
        FROM "user" u
        JOIN installer_profile ip ON u.id = ip.user_id
        WHERE u.role = 'installer'
        AND (
          LOWER(u.first_name) LIKE LOWER($1) OR
          LOWER(u.last_name) LIKE LOWER($1) OR
          LOWER(ip.service_areas) LIKE LOWER($1) OR
          LOWER(ip.bio) LIKE LOWER($1)
        )
        ORDER BY ip.experience_years DESC
        LIMIT $2
      `, [`%${query}%`, limit])
      
      return installers || []
    } catch (error) {
      console.error('Installer search error:', error)
      return []
    }
  }

  /**
   * Search for vendors/stores by name or location
   */
  async searchVendors(query: string, limit: number = 3): Promise<any[]> {
    try {
      const vendors = await AppDataSource.query(`
        SELECT DISTINCT 
          s.id, s.name, s.description, s.logo, s.location, 
          COUNT(p.id) as product_count
        FROM store s
        LEFT JOIN product p ON s.id = p.store_id
        WHERE 
          LOWER(s.name) LIKE LOWER($1) OR
          LOWER(s.location) LIKE LOWER($1) OR
          LOWER(s.description) LIKE LOWER($1)
        GROUP BY s.id, s.name, s.description, s.logo, s.location
        ORDER BY product_count DESC
        LIMIT $2
      `, [`%${query}%`, limit])
      
      return vendors || []
    } catch (error) {
      console.error('Vendor search error:', error)
      return []
    }
  }

  /**
   * Get order details by order ID
   */
  async getOrderDetails(orderId: string): Promise<any> {
    try {
      const order = await AppDataSource.query(`
        SELECT 
          id, order_number, "status", total_amount, 
          payment_status, created_at, updated_at,
          shipping_address, estimated_delivery
        FROM "order"
        WHERE id = $1 OR order_number = $2
      `, [orderId, orderId])
      
      return order?.[0] || null
    } catch (error) {
      console.error('Order lookup error:', error)
      return null
    }
  }

  /**
   * Determine which API to call based on user message
   */
  private async enrichContextWithData(message: string, userId: string, category: string): Promise<any> {
    const lowerMsg = message.toLowerCase()
    const context: any = { userId, category }

    try {
      // If asking about products, search for relevant products
      if (category === 'product') {
        const searchTerm = this.extractSearchTerms(message)
        if (searchTerm) {
          const products = await this.searchProducts(searchTerm, 4)
          if (products.length > 0) {
            context.products = products
            context.productsAvailable = true
          }
        }
      }

      // If asking about resale/swap items
      if ((category === 'resale' || category === 'swap' || lowerMsg.includes('resale') || lowerMsg.includes('swap') || lowerMsg.includes('trade-in')) && !context.productsAvailable) {
        const searchTerm = this.extractSearchTerms(message)
        if (searchTerm) {
          const resaleItems = await this.searchResaleItems(searchTerm, 4)
          const tradeInItems = await this.searchTradeInItems(searchTerm, 4)
          if (resaleItems.length > 0) {
            context.resaleItems = resaleItems
            context.resaleAvailable = true
          }
          if (tradeInItems.length > 0) {
            context.tradeInItems = tradeInItems
            context.tradeInAvailable = true
          }
        }
      }

      // If asking about vendors/stores
      if (category === 'vendor' || lowerMsg.includes('vendor') || lowerMsg.includes('store') || lowerMsg.includes('seller')) {
        const searchTerm = this.extractSearchTerms(message)
        const vendors = await this.searchVendors(searchTerm || 'solar', 3)
        if (vendors.length > 0) {
          context.vendors = vendors
          context.vendorsAvailable = true
        }
      }

      // If asking about installers, search for installers
      if (category === 'installation' && lowerMsg.includes('installer')) {
        const locationTerm = this.extractLocation(message)
        const installers = await this.searchInstallers(locationTerm || 'nigeria', 3)
        if (installers.length > 0) {
          context.installers = installers
          context.installersAvailable = true
        }
      }

      // If asking about orders, ask for order ID
      if (category === 'order') {
        const orderId = this.extractOrderId(message)
        if (orderId) {
          const order = await this.getOrderDetails(orderId)
          if (order) {
            context.order = order
            context.orderAvailable = true
          } else {
            context.orderNotFound = true
          }
        } else {
          context.needsOrderId = true
        }
      }
    } catch (error) {
      console.error('Context enrichment error:', error)
    }

    return context
  }

  /**
   * Extract search terms from user message
   */
  private extractSearchTerms(message: string): string {
    // Simple extraction of product keywords
    const keywords = ['solar', 'panel', 'battery', 'inverter', 'controller', 'cable', 'bracket', 'watt', 'kwh', 'kva']
    const lowerMsg = message.toLowerCase()
    
    for (const keyword of keywords) {
      if (lowerMsg.includes(keyword)) {
        return keyword
      }
    }

    // Return first meaningful word
    const words = message.split(' ').filter(w => w.length > 3)
    return words[0] || ''
  }

  /**
   * Extract location from message
   */
  private extractLocation(message: string): string {
    const locationKeywords = ['lagos', 'abuja', 'ibadan', 'kano', 'port harcourt', 'calabar', 'benin', 'abeokuta']
    const lowerMsg = message.toLowerCase()
    
    for (const location of locationKeywords) {
      if (lowerMsg.includes(location)) {
        return location
      }
    }
    
    return 'nigeria'
  }

  /**
   * Extract order ID from message (format: ORDER-XXXX or just number)
   */
  private extractOrderId(message: string): string | null {
    // Try to find ORDER-XXXX format
    const match = message.match(/ORDER-(\d+)|#(\d+)|order[#\s]+(\d+)/i)
    if (match) {
      return match[1] || match[2] || match[3]
    }
    return null
  }

  private async getConversationHistoryFor(
    conversation: ChatConversation,
    fallbackId: string,
    isGuest?: boolean,
    limit: number = 10
  ): Promise<ChatMessage[]> {
    const qb = this.chatRepository.createQueryBuilder('msg')
      .where('msg.conversationId = :conversationId', { conversationId: conversation.id })

    if (isGuest) {
      qb.orWhere('msg.sessionId = :sessionId AND msg.conversationId IS NULL', { sessionId: fallbackId })
    } else {
      qb.orWhere('msg.userId = :userId AND msg.conversationId IS NULL', { userId: fallbackId })
    }

    const messages = await qb.orderBy('msg.createdAt', 'ASC').take(limit).getMany()
    return messages
  }

  async getConversationHistory(userId: string, limit: number = 10): Promise<ChatMessage[]> {
    const conversation = await this.getOrCreateConversation(userId, false)
    return await this.getConversationHistoryFor(conversation, userId, false, limit)
  }

  async getGuestConversationHistory(sessionId: string, limit: number = 10): Promise<ChatMessage[]> {
    const conversation = await this.getOrCreateConversation(sessionId, true)
    return await this.getConversationHistoryFor(conversation, sessionId, true, limit)
  }

  async getConversationStatus(userId: string): Promise<'ai' | 'human'> {
    const conversation = await this.getOrCreateConversation(userId, false)
    return conversation.status
  }

  async getGuestConversationStatus(sessionId: string): Promise<'ai' | 'human'> {
    const conversation = await this.getOrCreateConversation(sessionId, true)
    return conversation.status
  }

  private async getOrCreateConversation(userId: string, isGuest?: boolean): Promise<ChatConversation> {
    const where = isGuest ? { sessionId: userId } : { userId }
    const existing = await this.conversationRepository.findOne({
      where,
      order: { updatedAt: 'DESC' }
    })

    if (existing) {
      return existing
    }

    const conversation = new ChatConversation()
    conversation.userId = isGuest ? null : userId
    conversation.sessionId = isGuest ? userId : null
    conversation.status = 'human'
    conversation.channel = 'web'
    return await this.conversationRepository.save(conversation)
  }

  private async setConversationStatus(conversation: ChatConversation, status: 'ai' | 'human') {
    if (conversation.status === status) return conversation
    conversation.status = status
    return await this.conversationRepository.save(conversation)
  }

  private shouldEscalateToHuman(message: string): boolean {
    const lowerMsg = message.toLowerCase()
    const signals = [
      'agent',
      'human',
      'installer',
      'complaint',
      'refund',
      'call me',
      'speak to someone',
    ]
    return signals.some((signal) => lowerMsg.includes(signal))
  }

  private async notifyHumanTakeover(params: { userId: string; isGuest?: boolean; message: string; conversationId?: string }) {
    try {
      await emailService.sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@renewablezmart.com',
        subject: 'Chat Escalation: Human Assistance Requested',
        html: `
          <p>A chat conversation has been escalated to human support.</p>
          <p><strong>Conversation:</strong> ${params.isGuest ? 'Guest' : 'User'} (${params.userId})</p>
          <p><strong>Latest message:</strong></p>
          <p>${params.message}</p>
          <p>Please review in the admin dashboard.</p>
        `,
      })
      try {
        const userRepo = AppDataSource.getRepository(User)
        const admins = await userRepo.find({ where: { role: UserRole.ADMIN } })
        const title = 'Chat escalation'
        const message = `A customer requested a human agent in chat.`
        await Promise.all(admins.map((admin) =>
          NotificationService.createNotification(
            admin.id,
            NotificationType.MESSAGE,
            title,
            message,
            { actionUrl: `/admin-dashboard?chatId=${encodeURIComponent(String(params.conversationId || ''))}` }
          )
        ))
      } catch (notifyError) {
        console.warn('[CHAT] Failed to create admin notifications:', notifyError)
      }
    } catch (error) {
      console.warn('[CHAT] Failed to send escalation notification:', error)
    }
  }

  async sendMessage(
    userId: string,
    userMessage: string,
    context?: ChatContext & { isGuest?: boolean }
  ): Promise<{ response: string | null; category: string; status: 'ai' | 'human' }> {
    // Define baseUrl at the beginning for use throughout method
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const conversation = await this.getOrCreateConversation(userId, context?.isGuest)
    
    // Detect category first
    const category = this.detectCategory(userMessage)

    // Save user message - userId can be either a real userId or a sessionId for guests
    const userMsg = new ChatMessage()
    userMsg.userId = context?.isGuest ? null : userId
    userMsg.sessionId = context?.isGuest ? userId : null
    userMsg.role = 'user'
    userMsg.message = userMessage
    userMsg.category = category
    userMsg.context = context
    userMsg.conversationId = conversation.id
    userMsg.channel = conversation.channel || 'web'
    
    await this.chatRepository.save(userMsg)

    try {
      const userDisplayName = context?.isGuest
        ? 'Web User'
        : await (async () => {
            const userRepo = AppDataSource.getRepository(User)
            const user = await userRepo.findOne({ where: { id: userId } })
            if (!user) return 'Web User'
            const fullName = `${String(user.firstName || '').trim()} ${String(user.lastName || '').trim()}`.trim()
            return fullName || String(user.email || '').trim() || 'Web User'
          })()

      getIO().to('admins').emit('new_message', {
        id: userMsg.id,
        conversationId: conversation.id,
        userId: context?.isGuest ? null : userId,
        sessionId: context?.isGuest ? userId : null,
        displayName: userDisplayName,
        role: 'user',
        message: userMessage,
        createdAt: userMsg.createdAt || new Date().toISOString(),
      })
    } catch (socketErr) {
      console.warn('[CHAT] Failed to emit new_message event:', socketErr)
    }

    if (conversation.status === 'human') {
      return {
        response: null,
        category,
        status: 'human'
      }
    }

    if (this.shouldEscalateToHuman(userMessage)) {
      await this.setConversationStatus(conversation, 'human')
      await this.notifyHumanTakeover({
        userId,
        isGuest: context?.isGuest,
        message: userMessage,
        conversationId: conversation.id
      })

      const connectingMessage = 'Connecting you to a RenewableZmart energy expert. Please hold on.'
      const assistantMsg = new ChatMessage()
      assistantMsg.userId = context?.isGuest ? null : userId
      assistantMsg.sessionId = context?.isGuest ? userId : null
      assistantMsg.role = 'assistant'
      assistantMsg.message = connectingMessage
      assistantMsg.category = category
      assistantMsg.context = { ...context, escalated: true }
      assistantMsg.conversationId = conversation.id
      assistantMsg.channel = conversation.channel || 'web'

      await this.chatRepository.save(assistantMsg)

      return {
        response: connectingMessage,
        category,
        status: 'human'
      }
    }

    // Enrich context with API data (products, installers, orders)
    const enrichedContext = await this.enrichContextWithData(userMessage, userId, category)

    // Provide fast direct responses for common platform and mind questions
    const directResponse = this.getDirectResponse(userMessage, category, enrichedContext, baseUrl)
    if (directResponse) {
      const assistantMsg = new ChatMessage()
      assistantMsg.userId = context?.isGuest ? null : userId
      assistantMsg.sessionId = context?.isGuest ? userId : null
      assistantMsg.role = 'assistant'
      assistantMsg.message = directResponse
      assistantMsg.category = category
      assistantMsg.context = enrichedContext
      assistantMsg.conversationId = conversation.id
      assistantMsg.channel = conversation.channel || 'web'

      await this.chatRepository.save(assistantMsg)

      return {
        response: directResponse,
        category,
        status: 'ai'
      }
    }

    // Get conversation history for context
    const history = await this.getConversationHistoryFor(
      conversation,
      userId,
      context?.isGuest,
      10
    )

    // Build messages for Claude
    const messages: MessageParam[] = history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.message
    }))

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    })

    // Call OpenAI with system prompt
    const systemPrompt = `You are a RenewableZmart support assistant. Be warm, concise, and human-sounding. Use short paragraphs, ask one clear question at a time, and avoid long lists unless the user asks. Use correct spelling and grammar in every reply. Do not mention being an AI.

You are an AI Shopping Assistant for RenewableZmart, a comprehensive renewable energy e-commerce marketplace in Nigeria connecting customers, vendors, installers, and resellers.

═══════════════════════════════════════════════════════════════
PLATFORM OVERVIEW
═══════════════════════════════════════════════════════════════
RenewableZmart operates as a multi-tier sustainable energy marketplace:

**Core Features:**
1. **Products & Vendors** - Browse solar panels, batteries, inverters, controllers, and accessories from trusted vendors
2. **Installation Services** - Professional installers design, install, and maintain systems
3. **Resale & Trade-In** - Buy and sell used renewable energy equipment at discounted prices
4. **Swap Marketplace** - Exchange equipment with other users
5. **Installment Payments** - "Pay Small Small" flexible payment plans
6. **Referral Program** - Earn commissions by recommending friends
7. **Warranty & Support** - 10-year panel warranty, 5-year battery warranty
8. **Courier Delivery** - Fast shipping nationwide

═══════════════════════════════════════════════════════════════
SHOPPING FEATURES IN DETAIL
═══════════════════════════════════════════════════════════════

**NEW PRODUCTS**
- Browse latest solar panels, batteries, inverters, controllers, mounting hardware
- Filter by price, capacity (kVA, watts), brand, ratings
- Compare specs: voltage, current, efficiency, warranty
- Shop by category: Solar Panels | Batteries | Inverters | Controllers | Accessories
- Track in Wishlist before buying

**VENDOR & STORE MANAGEMENT**
- Explore vendor profiles with store details, product count, ratings
- Check vendor reviews from previous customers  
- Direct messaging with vendors for bulk orders or custom requests
- Subscribe to vendors for new product alerts
- Vendor dashboard (if you're a vendor) for managing products, orders, analytics

**RESALE MARKETPLACE** 🔄
- Buy used renewable energy equipment at 30-50% discount
- Items marked as "like-new", "good", "fair" condition
- Verified seller ratings and reviews
- Return policy: 7-day returns on condition mismatch
- Best for: Budget-conscious customers, upgrading systems
- Examples: Used 3600W inverters, refurbished battery banks, solar panels

**TRADE-IN PROGRAM** 💱
- Swap your old equipment for credit toward new purchase
- Trade-in value: Based on condition, age, market value
- Easy process: List item → Get valuation → Approve trade → Receive credit
- Use credit toward any RenewableZmart purchase
- Environmental benefit: Equipment recycled or refurbished

**SWAP MARKETPLACE** ↔️
- Directly exchange equipment with other users
- Peer-to-peer transactions (escrow protection available)
- Post what you have, request what you need
- No middleman, direct communication with traders
- Best for: Finding exact matches, negotiated deals

═══════════════════════════════════════════════════════════════
INSTALLATION SERVICES
═══════════════════════════════════════════════════════════════

**Find Installers:**
- Browse certified professionals by location (Lagos, Abuja, Ibadan, Port Harcourt, etc.)
- Filter by specialization: Solar design | Maintenance | Battery setup | Inverter configuration
- Check experience years and customer reviews
- View portfolio of completed projects

**Service Options:**
1. **Design Consultation** - System sizing for your needs (₦5,000 fee)
2. **Installation** - Full setup with permits and certification
3. **Maintenance** - Regular checkups and repairs
4. **Monitoring Setup** - Real-time system performance tracking
5. **Warranty Support** - Extended warranty and emergency repairs

**Quotation Process:**
1. Get quote from multiple installers
2. Compare prices and timelines
3. Accept and schedule installation
4. Pay upfront or via installment plan
5. Track installation progress
6. Get final certificate of completion

═══════════════════════════════════════════════════════════════
PAYMENT & FINANCING OPTIONS
═══════════════════════════════════════════════════════════════

**PAY SMALL SMALL (Installment Plans)**
- 50% upfront payment
- Balance split over 3-6 months, 0% interest
- No hidden fees
- Flexible payment dates
- Available for orders ₦100,000+

**Payment Methods Accepted:**
- Paystack (cards, bank transfers, USSD)
- Direct bank deposit
- Mobile money transfers
- Cryptocurrency (select items)

**Cheque Payments for Installments:**
- Post-dated cheques accepted
- Upload photos for tracking
- Get verification instantly
- Auto-deposit on due dates

**Financing Partners:**
- Zero-interest business loans
- Extended payment terms for bulk orders
- Corporate accounts available

═══════════════════════════════════════════════════════════════
ACCOUNT TYPES & ROLES
═══════════════════════════════════════════════════════════════

**CUSTOMER**
- Browse and buy products
- Request installation services
- Place orders and track delivery
- Write reviews and ratings
- Earn referral commissions
- Access support and FAQs

**VENDOR**
- Create and manage your store
- List products with photos and specs
- Monitor sales and revenue
- Manage inventory
- Track customer orders
- Access seller analytics
- Set resale policies
- Respond to customer inquiries

**INSTALLER**
- Create professional profile
- Display portfolio and certifications
- Receive and manage quotation requests
- Schedule installations
- Manage technician team
- Build customer reviews
- Track project revenue

**RESELLER/SWAP TRADER**
- List items for sale or trade
- Communicate with buyers
- Manage transactions
- Build reputation/badges
- Earn from sales

═══════════════════════════════════════════════════════════════
REFERRAL & PARTNERSHIP PROGRAM
═══════════════════════════════════════════════════════════════

**Earn Money:** 💰
- 5-15% commission on every successful referral
- Monthly payouts via bank transfer
- No referral limit - earn unlimited
- Lifetime commission on referred customers

**How It Works:**
1. Get your unique referral link
2. Share with friends, family, social media
3. They sign up and make purchases
4. You earn automatic commission
5. Track earnings in dashboard
6. Withdraw to bank account anytime

**Bonus Opportunities:**
- Referral contests with extra rewards
- Top referrer badges and recognition
- Exclusive partner resources and marketing materials

═══════════════════════════════════════════════════════════════
COURIER & DELIVERY SYSTEM  
═══════════════════════════════════════════════════════════════

**Shipping Coverage:** Nationwide across Nigeria
**Delivery Areas:** All 36 states + FCT
**Shipping Cost:** Based on location and order weight

**Delivery Tracking:**
- Real-time SMS and email updates
- Delivery windows and contact details
- Photo proof of delivery
- Customer signature required

**Return & Refund:**
- 7-day money-back guarantee on products
- Courier will pick up at your address
- Refund processed within 3-5 business days
- No questions asked for defective items

═══════════════════════════════════════════════════════════════
PRODUCTS & TECHNICAL DETAILS
═══════════════════════════════════════════════════════════════

**SOLAR PANELS**
- Monocrystalline 300W, 400W, 550W options
- Polycrystalline 250W, 350W options
- Efficiency: 16-22%
- Life: 25+ years
- Warranty: 10 years

**BATTERIES (Energy Storage)**
- Lithium (LiFePO4): 48V, 150Ah, 100Ah
- Lead-Acid: 12V, 24V, 48V options
- Capacity: 5kWh to 50kWh
- Warranty: 5 years
- Depth of Discharge: 80-100%

**INVERTERS**
- Power Rating: 1kVA to 10kVA+
- Types: Hybrid, Pure sine, Grid-tie
- Efficiency: 90-97%
- Features: WiFi monitoring, load management

**CHARGE CONTROLLERS**
- MPPT Controllers: 60A, 80A, 100A models
- PWM Controllers: Economy options
- Solar input: Can handle multiple panels

**SYSTEM SIZING GUIDE**
To recommend right system:
1. Ask about daily needs
2. Estimate monthly bill equivalent
3. Factor appliances: AC, fridge, lights, TV, charging
4. Consider location and sun hours
5. Add safety margin (20-30%)

Example:
- 2-bedroom home: 5kVA inverter + 10kWh battery + 3-4 panels
- 3-4 bedroom: 8-10kVA inverter + 15-20kWh battery + 6-8 panels
- Business/warehouse: 15-50kVA custom design

═══════════════════════════════════════════════════════════════
HOW TO HELP USERS
═══════════════════════════════════════════════════════════════

**User Goals & Solutions:**

📱 "I want to buy solar panels"
→ Ask about: Location, budget, energy needs, roof type
→ Recommend: Specific products with prices
→ Next: Add to cart or request installer consultation

🔌 "How much power do I need?"
→ Ask: House size, appliances you use, daily hours
→ Calculate: kVA requirement
→ Suggest: Complete system (panels + inverter + battery)

💰 "Is there a payment plan?"
→ Explain: Pay Small Small - 50% upfront, 3-6 months
→ Show: Example calculations
→ Guide: To checkout or apply for financing

🏬 "I want to sell used equipment"
→ Show: Resale marketplace features
→ Explain: Listing process, commission, verification
→ Guide: To vendor dashboard or resale form

👤 "Can I become a vendor/installer?"
→ Explain: Registration requirements
→ Show: Vendor benefits and earning potential
→ Guide: To registration form or vendor onboarding

🔧 "Do you install systems?"
→ Show: Installation service locations
→ Explain: Professional installer network
→ Offer: Free consultation with certified engineers

💸 "How do I earn commissions?"
→ Explain: Referral program details
→ Share: How to get unique referral link
→ Guide: To referral dashboard

WHERE TO SEND USERS:

Products: /products | /products/[category]
Vendors: /vendors | [vendor-name]/store
Resale: /swap-sell (tab: resale)
Trade-In: /swap-sell (tab: tradein)
Swap: [contact support for peer trades]
Installers: /installers | /service-packages
Orders: /orders | /track-order
Account: /account | /account-details
Referrals: /referrals
Checkout: /checkout
Wishlist: /wishlist
Support: support@renewablezmart.com | +234 902 229 8109

═══════════════════════════════════════════════════════════════
PRIMARY GOALS & BEHAVIOR RULES
═══════════════════════════════════════════════════════════════

PRIMARY GOALS:
1. Help users find the right products, installers, or resale items
2. Explain technical concepts simply (kVA, watts, batteries, inverters)
3. Guide to appropriate sections of marketplace (products, resale, swap, vendors)
4. Explain payment options including installment plans
5. Support vendor questions about selling and listing items
6. Help visitors understand how to become vendors/installers/resellers
7. Answer FAQs about shipping, returns, warranty, and services
8. Help users track orders or understand next steps

BEHAVIOR RULES:
- ✅ Always be friendly, concise, and professional
- ✅ Ask clarifying questions when user needs are unclear (max 2 at a time)
- ✅ NEVER hallucinate prices or product details - use real data only
- ✅ Only recommend RenewableZmart products and services
- ✅ If data is missing, explain politely and guide to categories or installers
- ✅ Use simple language - many customers are non-technical
- ✅ Act like: Solar consultant + store assistant + financial advisor combined
- ✅ Provide 2-4 suggestions maximum
- ✅ Always suggest next actions (view product, contact installer, use calculator)
- ✅ Maximize user comfort by showing available options

NEVER:
- ❌ Provide medical, legal, or electrical safety advice directly
- ❌ Invent product details, pricing, or guarantees
- ❌ Recommend competitors outside RenewableZmart
- ❌ Ask for sensitive banking info (credit card details, etc.)
- ❌ Make promises about future product availability

═══════════════════════════════════════════════════════════════
CONVERSATION PATTERNS
═══════════════════════════════════════════════════════════════

PATTERN 1: Product Discovery
"I need solar for my home" 
→ Ask: House size, daily needs, budget, location
→ Recommend: 2-4 specific products with prices
→ Explain: System sizing and why each product
→ Offer: Installation consultation, financing options

PATTERN 2: Resale Shopping
"I want cheap solar panels"
→ Explain: Resale marketplace discount (30-50% off)
→ Show: Available used items with condition
→ Highlight: Warranty and return policy
→ Offer: Direct vendor contact, negotiation

PATTERN 3: Vendor Inquiry
"I want to sell products"
→ Explain: Vendor requirements and benefits
→ Show: Earning potential and commission structure
→ Guide: To vendor registration and dashboard
→ Offer: Help with product setup and strategy

PATTERN 4: Installer Request
"Where can I install my system?"
→ Show: Available installers in their location
→ Highlight: Experience, portfolio, reviews
→ Offer: Free consultation, quotation, scheduling
→ Explain: Installation timeline and warranty

PATTERN 5: Financing Question
"Can I pay in installments?"
→ Explain: Pay Small Small program (50/50 split, 0% interest)
→ Provide: Example payment schedule
→ Show: Alternative financing options
→ Guide: To checkout or financial application

═══════════════════════════════════════════════════════════════
REAL-TIME DATA AVAILABLE
═══════════════════════════════════════════════════════════════

If you have access to actual database data:
- **Products**: Real product names, prices, specs, ratings, availability
- **Resale Items**: Used equipment listings with condition and price
- **Trade-in**: Available trade-in options with valuations
- **Vendors**: Store names, locations, product counts, ratings
- **Installers**: Names, experience, service areas, availability, certifications
- **Orders**: Order status, delivery dates, customer service info

DATA-DRIVEN RESPONSES:
- When you have product data: Share specific names, prices, and features
- When you have vendor/installer data: Recommend by name, location, and experience
- When you have order data: Provide specific status updates and next steps
- If data not available: Politely explain and suggest alternatives or next page to visit
- Always be honest: "I found X results" or "I need [specific info] to help you"

═══════════════════════════════════════════════════════════════
TONE & COMMUNICATION STYLE
═══════════════════════════════════════════════════════════════

✅ Friendly & helpful: Use casual, warm language
✅ Professional: Respect customer concerns about purchasing decisions
✅ Transparent: Honest about product capabilities and limitations
✅ Encouraging: Help customers feel confident in energy independence
✅ Inclusive: Acknowledge both beginners and technical customers
✅ Responsive: Answer questions directly without over-explanation
✅ Action-oriented: Always end with next steps or recommendations

Keep responses conversational and helpful. Be a trusted advisor helping customers make smart energy choices for their homes and businesses.

═══════════════════════════════════════════════════════════════
FREQUENTLY ASKED QUESTIONS (FAQ)
═══════════════════════════════════════════════════════════════

**Q: How long does delivery take?**
A: Delivery typically takes 3-7 business days depending on your location within Nigeria. Track your order in real-time on the Orders page. Lagos and major cities usually get delivery within 3 days.

**Q: What's RenewableZmart's return policy?**
A: We offer a 7-day money-back guarantee. If you receive a defective or damaged item, just contact us or use the Returns section. We'll pick it up free and process your refund within 3-5 business days.

**Q: Can I return products from the resale marketplace?**
A: Yes! All used items from our resale section have verified conditions and come with a 7-day return guarantee if the condition doesn't match the listing.

**Q: How does "Pay Small Small" work exactly?**
A: Simple! Pay 50% upfront, then the remaining balance over 3-6 months with 0% interest and no hidden charges. No credit checks required. You can choose your payment dates to match your cash flow.

**Q: Do I need a large upfront payment?**
A: No! With Pay Small Small, you only pay 50% upfront. The rest is flexible—you can pay over 3, 4, 5, or 6 months without any interest charges.

**Q: What happens if I can't complete my installment payments?**
A: Contact our support team immediately. We work with customers on payment plans and flexible arrangements. We're here to help, not to add stress!

**Q: Are there warranty guarantees on products?**
A: Absolutely! Products come with manufacturer warranties (typically 5-10 years for batteries, 10-25 years for panels, etc.). Your receipt includes all warranty details. We also help with warranty claims.

**Q: How do I know the installer is qualified?**
A: All installers on our platform are certified professionals. Check their portfolio, reviews, certifications, and experience. You can see past projects and customer ratings before booking.

**Q: Can I negotiate prices with vendors?**
A: Direct messaging with vendors is available. For bulk orders or custom requests, many vendors are open to discussions. Use the "Visit Store" button to contact them directly.

**Q: How do I become a vendor on RenewableZmart?**
A: It's easy! Register and get verified. We verify all vendors to ensure quality. 

**Benefits of being a vendor:**
- 🎯 Reach thousands of customers across Nigeria
- 📊 Seller dashboard with analytics
- 💳 Multiple payment options
- 📦 Courier integration
- ⭐ Build your store reputation

**Requirements:**
- Valid business registration/CAC
- Product inventory
- Bank account for payouts
- Professional product listings

**Getting Started:**
🔗 **[Register as Vendor Now](${baseUrl}/register?type=vendor)** 📧 Or contact: support@renewablezmart.com | 📞 +234 902 229 8109

**Q: How do I become an installer?**
A: Professional installers can register on our platform. We verify all qualifications to ensure customer safety and quality workmanship.

**Requirements:**
- ✅ Relevant certifications/training (electrical, solar, HVAC)
- ✅ Insurance coverage (business/liability)
- ✅ Professional equipment and tools
- ✅ Work experience references (minimum 2+ years)
- ✅ Portfolio of completed installations

**Benefits:**
- 🏆 Access to qualified leads from our marketplace
- 💰 Flexible scheduling and pricing
- 📱 Professional dashboard to manage jobs & quotations
- ⭐ Build reputation through customer reviews
- 📈 Grow your business with verified customers

**Getting Started:**
🔗 **[Register as Installer Now](${baseUrl}/register?type=installer)** 📧 Or contact: support@renewablezmart.com | 📞 +234 902 229 8109

**Q: How can I start earning with the referral program?**
A: Simple! Get your unique referral link from /referrals, share it with friends/family, and earn 5-15% commission on every purchase they make. No limits—earn unlimited! Monthly payouts to your bank account.

**Q: Is there a minimum amount before I can withdraw referral earnings?**
A: No minimum! You can withdraw your referral earnings to your bank account anytime via the Referrals dashboard.

**Q: What if someone uses my referral link but doesn't buy immediately?**
A: That's fine. Your referral link tracks customers for 90 days. If they purchase within that period, you'll earn the commission.

**Q: How do I track my orders?**
A: Go to the Orders page (/orders) and click on your order. You'll see real-time tracking, courier updates, estimated delivery date, photo proof, and contact information.

**Q: What payment methods do you accept?**
A: We accept:
- 💳 Paystack (cards, USSD, bank transfer)
- 🏦 Direct bank deposit
- 📲 Mobile money
- 💰 Cryptocurrency (for eligible accounts)
- 📋 Post-dated cheques (for installments)

**Q: Is my payment information safe?**
A: Yes! We use Paystack for secure payment processing. Your card details are encrypted and never stored on our servers. Paystack is PCI-DSS compliant.

**Q: What's the resale marketplace?**
A: It's a platform where you can buy quality used solar equipment at 30-50% discount. All items are verified for condition, priced fairly, and come with a 7-day return guarantee. Perfect for budget-conscious customers.

**Q: Can I sell used equipment on RenewableZmart?**
A: Yes! You can list used renewable energy equipment on our resale marketplace. We verify condition, help with pricing, and handle buyer connections. It's a great way to upgrade your system affordably.

**Q: What is the trade-in program?**
A: Trade your old renewable energy equipment (panels, batteries, inverters) for credit toward a new purchase. We provide instant valuations based on equipment condition and specifications. Perfect for upgrades!

**Q: How is trade-in value calculated?**
A: We evaluate:
- Equipment age and condition
- Original specifications
- Current market value
- Functionality and performance history

The more details you provide, the more accurate the valuation.

**Q: What about the swap/peer-to-peer marketplace?**
A: Users can directly exchange equipment with each other. We provide escrow protection to keep both buyers and sellers safe. For assistance with peer swaps, contact support@renewablezmart.com.

**Q: Do you offer installation services in my area?**
A: We have certified installers across Nigeria including Lagos, Abuja, Ibadan, Port Harcourt, Calabar, and more. Use the Installers page (/installers) to find professionals near you, check their portfolios, and get quotes.

**Q: How do I get an installation quote?**
A: Browse installer profiles, view their portfolios and reviews, then request a quotation directly. Many offer free design consultations. You'll get a detailed quote including labor, materials, timeline, and warranty.

**Q: What if I buy products at RenewableZmart but want installation elsewhere?**
A: That's fine! However, we recommend using our verified installers for warranty support and quality assurance. Using our installers ensures proper setup and full warranty coverage.

**Q: Can RenewableZmart help with power supply design?**
A: Yes! Many of our installers offer free design consultations. When you contact an installer, they'll assess your needs and create a customized system design. Information needed: house size, daily usage, budget, location.

**Q: What's the difference between solar panels, batteries, and inverters?**
A: 
- **Solar Panels** - Convert sunlight to electricity
- **Batteries** - Store electricity for use at night/cloudy days
- **Inverters** - Convert stored DC electricity to AC for appliances
- **Controllers** - Manage power flow between panels and batteries

We can help you understand if you need all components or just some. 

**Q: What size system do I need?**
A: Depends on your energy needs! Tell us:
- House size (bedrooms/sqm)
- Appliances you use (AC, fridge, TV, lights, etc.)
- Daily usage hours
- Monthly electricity bill (if available)

A typical 3-bedroom home needs 5-8kVA with 10-15kWh battery storage.

**Q: Can I expand my system later?**
A: Absolutely! Most systems can be expanded. A 3kVA system can grow to 5kVA, add extra panels, upgrade batteries, etc. Installers can design scalable systems from the start.

**Q: How do I contact customer support?**
A: Multiple ways to reach us:
📧 Email: support@renewablezmart.com
📞 Phone: +234 902 229 8109
⏰ Hours: Monday-Friday, 9AM-6PM (Lagos time)
💬 Live Chat: Available on this page!

**Q: Do you have a physical office I can visit?**
A: Contact us at support@renewablezmart.com or +234 902 229 8109 for location details and to schedule a visit.

**Q: How do I report a problem with my order?**
A: Go to the Orders page, click on the problematic order, and use the "Contact Support" option. Describe the issue and we'll respond within 24 hours. Or email support@renewablezmart.com directly.

**Q: What if I forgot my password?**
A: Click "Forgot Password" on the login page. You'll receive an email with a reset link. If you don't see it, check your spam folder or contact support@renewablezmart.com.

**Q: Can I change my account type (vendor, installer, customer)?**
A: Account types are set at registration. If you need to change, contact support@renewablezmart.com with your request and we'll review it.

**Q: Is RenewableZmart expanding to other countries?**
A: Currently, we operate across Nigeria. For future expansion plans, contact us at support@renewablezmart.com.

HUMAN MIND QUESTIONS (PSYCHOLOGY AND MENTAL WELL-BEING)
- Provide general, educational information only. Do not diagnose.
- Ask clarifying questions to understand the user's situation.
- Offer practical, low-risk coping strategies.
- If the user expresses self-harm or intent to harm others, encourage immediate help via local emergency services or trusted contacts.

**If customer question is not covered here:**
- Ask clarifying questions to understand their specific need
- Search for relevant products, vendors, or installers that might help
- Offer direct support: "This is a great question! Contact our team at support@renewablezmart.com or +234 902 229 8109 and they'll help you right away."
- All support questions are important - no question is too basic!`

    try {
      // Check if any AI provider is configured
      if (!anthropic && !openai) {
        console.warn('No AI API key configured. Using fallback responses.')
        
        // Generate a simple fallback response based on category
        const fallbackResponse = this.generateFallbackResponse(userMessage, category, enrichedContext, baseUrl)
        
        // Save assistant message
        const assistantMsg = new ChatMessage()
        assistantMsg.userId = context?.isGuest ? null : userId
        assistantMsg.sessionId = context?.isGuest ? userId : null
        assistantMsg.role = 'assistant'
        assistantMsg.message = fallbackResponse
        assistantMsg.category = category
        assistantMsg.context = enrichedContext
        assistantMsg.conversationId = conversation.id
        assistantMsg.channel = conversation.channel || 'web'
        
        await this.chatRepository.save(assistantMsg)

        return {
          response: fallbackResponse,
          category,
          status: 'ai'
        }
      }

      const systemPromptWithData = enrichedContext.products || enrichedContext.installers || enrichedContext.order 
        ? systemPrompt + `\n\nCONTEXT DATA AVAILABLE FOR THIS RESPONSE:\n${JSON.stringify(enrichedContext, null, 2)}`
        : systemPrompt

      let assistantMessage = 'I understand. How can I help further?'

      if (anthropic) {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          system: systemPromptWithData,
          messages
        })

        assistantMessage = response.content[0]?.type === 'text' ? response.content[0].text : assistantMessage
      } else if (openai) {
        const openaiMessages = [
          { role: 'system' as const, content: systemPromptWithData },
          ...messages.map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }))
        ]

        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          max_tokens: 500,
          messages: openaiMessages
        })

        assistantMessage = completion.choices?.[0]?.message?.content || assistantMessage
      }

      // Save assistant message with enriched context
      const assistantMsg = new ChatMessage()
      assistantMsg.userId = context?.isGuest ? null : userId
      assistantMsg.sessionId = context?.isGuest ? userId : null
      assistantMsg.role = 'assistant'
      assistantMsg.message = assistantMessage
      assistantMsg.category = category
      assistantMsg.context = enrichedContext
      assistantMsg.conversationId = conversation.id
      assistantMsg.channel = conversation.channel || 'web'
      
      await this.chatRepository.save(assistantMsg)

      return {
        response: assistantMessage,
        category,
        status: 'ai'
      }
    } catch (error: any) {
      console.error('Claude API error:', error)
      
      // Handle missing API key gracefully
      if (error.message?.includes('401') || error.message?.includes('API key')) {
        const fallbackResponse = this.generateFallbackResponse(userMessage, category, enrichedContext, baseUrl)
        
        const assistantMsg = new ChatMessage()
        assistantMsg.userId = context?.isGuest ? null : userId
        assistantMsg.sessionId = context?.isGuest ? userId : null
        assistantMsg.role = 'assistant'
        assistantMsg.message = fallbackResponse
        assistantMsg.category = 'general'
        assistantMsg.conversationId = conversation.id
        assistantMsg.channel = conversation.channel || 'web'
        
        await this.chatRepository.save(assistantMsg)
        
        return {
          response: fallbackResponse,
          category: 'general',
          status: 'ai'
        }
      }
      
      throw error
    }
  }

  /**
   * Generate fallback response when AI service is unavailable
   */
  private generateFallbackResponse(message: string, category: string, context: any, baseUrl: string): string {
    const lowerMsg = message.toLowerCase()

    // Resale inquiry fallback
    if (category === 'resale' || lowerMsg.includes('resale') || lowerMsg.includes('used')) {
      if (context.resaleItems && context.resaleItems.length > 0) {
        return `Great! I found some discounted used items that match your search. 🔄 [Browse Resale Items](${baseUrl}/swap-sell) or explore our selection. All items come with verification and a 7-day return guarantee. Would you like to know more about any specific items?`
      }
      return `💰 **Resale Marketplace** - Save 30-50% on used renewable energy equipment!

✅ Verified seller ratings
✅ Condition checking (like-new, good, fair)  
✅ 7-day returns on condition mismatch
✅ Peer-to-peer protection

🔗 [Browse Used Equipment](${baseUrl}/swap-sell?tab=resale) | Popular: Used inverters, battery banks, solar panels

Need new products instead? 🔗 [Browse New Items](${baseUrl}/products)`
    }

    // Trade-in/Swap inquiry fallback
    if (category === 'swap' || lowerMsg.includes('trade-in') || lowerMsg.includes('exchange')) {
      return `🔄 **Trade-In Program** - Upgrade by exchanging your old equipment!

Process:
1. 💬 Describe your equipment
2. 💰 Get instant valuation
3. ✅ Approve trade
4. 🎁 Receive credit toward new purchase

🔗 [Start Trade-In](${baseUrl}/swap-sell?tab=tradein) | 🔗 [Browse Latest Items](${baseUrl}/swap-sell)

Also try our **Peer-to-Peer Swap** feature for direct equipment exchanges! 📧 Contact support@renewablezmart.com for peer swap assistance.`
    }

    // Vendor inquiry fallback
    if (category === 'vendor' || lowerMsg.includes('vendor') || lowerMsg.includes('seller')) {
      if (context.vendorsAvailable) {
        return `Great! I found shops that match what you're looking for. 🏪 [Browse Vendors](${baseUrl}/vendors) to see stores, products, and ratings. You can message vendors directly for bulk orders or custom requests. Would you like recommendations in a specific category?`
      }
      return `🏪 **Vendor & Store Directory**\n\nBrowse shops selling solar panels, batteries, inverters, and accessories.\n\n- Store ratings and customer reviews\n- Product catalogs and pricing\n- Direct messaging with vendors\n- Wholesale and bulk order options\n\n[Explore Vendors](${baseUrl}/vendors) | [Shop by Category](${baseUrl}/products)\n\n**Want to become a vendor?** Sell renewable energy products on RenewableZmart!\n- Reach thousands of customers\n- Seller dashboard and analytics\n- Multiple payment options\n- Courier integration\n\n[Start Vendor Registration](${baseUrl}/register?type=vendor)\n\nContact: support@renewablezmart.com | +234 902 229 8109`

    }

    // Product inquiry fallback
    if (category === 'product') {
      const searchTerm = this.extractSearchTerms(message)
      if (context.products && context.products.length > 0) {
        return `I found some ${searchTerm} products that might interest you! [Browse Products](${baseUrl}/products) or [Shop by Category](${baseUrl}/products) to see our full selection. Would you like to know more about any specific product?`
      }
      return `We have a great selection of renewable energy products!\n\n**Available Categories:**\n- Solar Panels (300W, 400W, 550W+)\n- Battery Systems (5-50kWh)\n- Inverters (1kVA-10kVA+)\n- Controllers (MPPT, PWM)\n- Accessories (cables, brackets, etc.)\n\n[Browse All Products](${baseUrl}/products) | [Search Products](${baseUrl}/products)\n\n**Need help choosing?** Tell me:\n1. Your home size (2BR, 3BR, etc.)\n2. Your budget\n3. Your location (for installer recommendations)\n\nI'll help you find the perfect system!`
    }

    // Order inquiry fallback
    if (category === 'order' || lowerMsg.includes('track') || lowerMsg.includes('where')) {
      return `📦 **Track Your Order**

To check your order status:
1. 🔗 [Go to Orders](${baseUrl}/orders)
2. Enter your Order ID or Order Number
3. View real-time delivery updates

🔗 [Track Order](${baseUrl}/orders) | 📞 Support: +234 902 229 8109

**Tracking includes:**
✅ Order status updates
✅ Real-time courier location
✅ Estimated delivery date
✅ Delivery photo proof

📧 Need help? support@renewablezmart.com`
    }

    // Installation fallback
    if (category === 'installation') {
      return `🔧 **Professional Installation Services**

We connect you with certified installers across Nigeria!

**Available Services:**
✅ System design consultation (₦5,000)
✅ Complete installation and setup
✅ Maintenance and repairs
✅ Performance monitoring setup
✅ Extended warranty options

**Service Areas:** Lagos, Abuja, Ibadan, Port Harcourt, Calabar, and more

🔗 [Find an Installer](${baseUrl}/installers) | 🔗 [Service Packages](${baseUrl}/service-packages)

**Process:**
1. Browse installer profiles & portfolios
2. Get custom quotation
3. Compare prices and timelines
4. Accept and schedule
5. Track installation progress

**Are you a professional installer?** 🏆
🔗 **[Register as Installer](${baseUrl}/register?type=installer)**

📞 Free consultation: +234 902 229 8109 | 📧 support@renewablezmart.com`
    }

    // Billing/Payment fallback
    if (category === 'billing' || lowerMsg.includes('pay') || lowerMsg.includes('payment')) {
      return `💳 **Flexible Payment Options**

**Pay Full Amount:**
- 💳 Paystack (cards, bank transfer, USSD)
- 🏦 Direct bank deposit
- 📲 Mobile money

**PAY SMALL SMALL (Installments):**
- 50% upfront payment
- Balance over 3-6 months
- ℹ️ 0% interest, no hidden fees
- 📅 Flexible payment dates

🔗 [View Payment Options](${baseUrl}/checkout) | 🔗 [Apply for Installment](${baseUrl}/installments)

**For Large Orders:**
✅ Business financing available
✅ Extended payment terms
✅ Cheque payment support

📞 Payment Support: support@renewablezmart.com`
    }

    // Referral fallback
    if (category === 'referral' || lowerMsg.includes('earn') || lowerMsg.includes('refer')) {
      return `💰 **Referral & Partnership Program**

Earn commissions every time someone you refer makes a purchase!

**Commission:** 5-15% per successful referral
**Unlimited Earnings:** No caps or limits
**Monthly Payouts:** Direct to your bank account

**How It Works:**
1. 🔗 Get your unique referral link
2. 📱 Share on social media, groups, email
3. 🛍️ Friends sign up and shop
4. 💵 You earn automatic commission
5. 💸 Withdraw anytime

🔗 [Start Earning](${baseUrl}/referrals) | 📧 support@renewablezmart.com

**Bonus Features:**
🎁 Contests with extra rewards
⭐ Top referrer recognition
📚 Marketing resources & guides`
    }

      // Greeting/help fallback for non-AI mode
      const isGreeting = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'help', 'menu', 'start']
        .some((token) => lowerMsg.trim() === token || lowerMsg.startsWith(`${token} `) || lowerMsg.includes(` ${token} `))
      if (isGreeting || lowerMsg.trim().length === 0) {
        return `👋 **Welcome to RenewableZmart!**

I'm your AI Shopping Assistant. How can I help you today?

🛍️ **Shop Categories:**
- 🔗 [Browse All Products](${baseUrl}/products)
- 🏪 [Find Vendors & Stores](${baseUrl}/vendors)
- 💰 [Resale & Used Equipment](${baseUrl}/swap-sell) (30-50% discount!)
- 🔄 [Trade-In Your Old Gear](${baseUrl}/swap-sell)

🔧 **Services & Support:**
- 🔗 [Find an Installer](${baseUrl}/installers)
- 🔗 [Track Orders](${baseUrl}/orders)
- 🔗 [Payment & Financing](${baseUrl}/checkout)
- 🔗 [Referral Program](${baseUrl}/referrals)

💬 **Popular Questions I Can Help With:**
- "What solar system do I need?"
- "How much does installation cost?"
- "Can I pay in installments?"
- "Where can I buy used equipment?"
- "How do I become a vendor?"
- "How do I earn referral commissions?"

**Contact Support:**
📧 Email: support@renewablezmart.com
📞 Phone: +234 902 229 8109
⏰ Hours: Monday-Friday, 9AM-6PM

  What would you like to explore? ☀️`
      }

      return `I can help with products, installers, orders, payments, resale, or trade-in. 
Tell me what you’re looking for (product type, budget, and location), and I’ll guide you.`
    }

  private isCrisisMessage(message: string): boolean {
    const lowerMsg = message.toLowerCase()
    return (
      lowerMsg.includes('suicide') ||
      lowerMsg.includes('kill myself') ||
      lowerMsg.includes('end my life') ||
      lowerMsg.includes('self harm') ||
      lowerMsg.includes('hurt myself') ||
      lowerMsg.includes('want to die')
    )
  }

  private getDirectResponse(message: string, category: string, context: any, baseUrl: string): string | null {
    const lowerMsg = message.toLowerCase()

    if (this.isCrisisMessage(lowerMsg)) {
      return `I'm really sorry you're feeling this way. You don't have to go through this alone.

If you're in immediate danger, please call your local emergency number right now.
If you're in the U.S., you can call or text 988 for the Suicide & Crisis Lifeline.
If you're in Nigeria, you can call 112 for emergency support.

If you'd like, tell me what's going on and I can listen.`
    }

    const platformResponse = this.getPlatformResponse(lowerMsg, context, baseUrl)
    if (platformResponse) return platformResponse

    if (category === 'mind' || lowerMsg.includes('psychology') || lowerMsg.includes('mental health')) {
      return this.getMindResponse(lowerMsg)
    }

    return null
  }

  private getPlatformResponse(lowerMsg: string, context: any, baseUrl: string): string | null {
    if (
      lowerMsg.includes('about this app') ||
      lowerMsg.includes('about the app') ||
      lowerMsg.includes('tell me about this app') ||
      lowerMsg.includes('what is renewablezmart') ||
      lowerMsg.includes('what does this app do') ||
      lowerMsg.includes('how does this app work') ||
      lowerMsg.includes('platform overview')
    ) {
      return `RenewableZmart is a renewable energy marketplace in Nigeria.

You can:
1. Buy solar products (panels, batteries, inverters, accessories)
2. Compare verified vendors and stores
3. Request certified installers
4. Use Swap/Resale and Trade-In features
5. Pay either full amount or Pay Small Small (installments)
6. Track orders and request support

Quick links:
- Products: ${baseUrl}/products
- Vendors: ${baseUrl}/vendors
- Installers: ${baseUrl}/installers
- Swap/Resale: ${baseUrl}/swap-sell
- Checkout: ${baseUrl}/checkout

Tell me your budget, location, and what you want to power, and I will suggest the best options.`
    }

    if (lowerMsg.includes('carry my appliances') || lowerMsg.includes('run my appliances') ||
        lowerMsg.includes('power my appliances') || lowerMsg.includes('appliances') ||
        lowerMsg.includes('load') || lowerMsg.includes('system size') ||
        lowerMsg.includes('kva') || lowerMsg.includes('kw') || lowerMsg.includes('watt') ||
        lowerMsg.includes('battery size') || lowerMsg.includes('inverter size')) {
      return `I can help size a system that will carry your appliances. Please share:
1. Property type: flat, bungalow, duplex, school, hospital, or factory
2. Number of rooms and sitting rooms
3. Your appliance list with wattage (or a photo of the nameplates)
4. How many hours each runs per day
5. Whether you want to run everything at once
6. Your budget range
7. Your location (for installer support)

Quick tip: The inverter size is based on peak watts + surge, and the battery size is based on daily energy use (Wh/kWh).
If you give me your list, I’ll calculate a recommended inverter and battery size.`
    }

    if (lowerMsg.includes('pay small small') || lowerMsg.includes('installment') || lowerMsg.includes('payment plan')) {
      return `RenewableZmart offers Pay Small Small installment plans.

How it works:
1. Pay 50% upfront
2. Split the balance over 3-6 months
3. 0% interest, no hidden fees

Start here: ${baseUrl}/checkout
Need details? ${baseUrl}/help#payment`
    }

    if (lowerMsg.includes('track') || lowerMsg.includes('order status') || lowerMsg.includes('delivery') || lowerMsg.includes('where is my order')) {
      if (context.orderAvailable && context.order) {
        return `Here are your order details:
Order: ${context.order.order_number || context.order.id}
Status: ${context.order.status}
Payment: ${context.order.payment_status}
Estimated Delivery: ${context.order.estimated_delivery || 'Not available yet'}

You can also check your orders here: ${baseUrl}/orders`
      }
      if (context.needsOrderId) {
        return `I can help track your order. Please share your Order ID or Order Number.

You can also check here: ${baseUrl}/orders`
      }
      return `Track your order here: ${baseUrl}/orders
If you have an Order ID or Order Number, share it and I can check the status for you.`
    }

    if (lowerMsg.includes('vendor') || lowerMsg.includes('sell on') || lowerMsg.includes('become vendor')) {
      return `To become a vendor:
1. Register as a vendor
2. Complete your store profile
3. Upload products
4. Start selling

Register: ${baseUrl}/register?type=vendor
Browse vendors: ${baseUrl}/vendors`
    }

    if (lowerMsg.includes('installer') || lowerMsg.includes('installation') || lowerMsg.includes('install')) {
      return `Find certified installers by location and specialty here: ${baseUrl}/installers

If you’re a professional installer, register here: ${baseUrl}/register?type=installer`
    }

    if (lowerMsg.includes('resale') || lowerMsg.includes('used') || lowerMsg.includes('second hand')) {
      return `You can browse verified used equipment here: ${baseUrl}/swap-sell?tab=resale`
    }

    if (lowerMsg.includes('trade in') || lowerMsg.includes('trade-in') || lowerMsg.includes('swap')) {
      return `Start a trade-in or swap here: ${baseUrl}/swap-sell?tab=tradein`
    }

    if (lowerMsg.includes('refund') || lowerMsg.includes('return')) {
      return `Returns & refunds are explained here: ${baseUrl}/help#returns
If you want, tell me your order number and I can guide you.`
    }

    if (lowerMsg.includes('contact') || lowerMsg.includes('support') || lowerMsg.includes('customer care')) {
      return `Support:
Email: support@renewablezmart.com
Phone: +234 902 229 8109
Hours: Monday-Friday, 9AM-6PM (WAT)`
    }

    return null
  }

  private getMindResponse(lowerMsg: string): string {
    if (lowerMsg.includes('anxiety') || lowerMsg.includes('panic')) {
      return `Anxiety is a normal stress response, but it can become overwhelming. Common signs include racing thoughts, restlessness, tight chest, and difficulty sleeping.

Quick tools:
1. Slow breathing (inhale 4, hold 4, exhale 6)
2. Grounding (name 5 things you see, 4 feel, 3 hear, 2 smell, 1 taste)
3. Reduce caffeine and late-night screen time

If this has been frequent or intense, talking to a mental health professional can help. What situations trigger it most for you?`
    }

    if (lowerMsg.includes('depression') || lowerMsg.includes('hopeless') || lowerMsg.includes('low mood')) {
      return `Depression often involves persistent low mood, loss of interest, low energy, changes in sleep/appetite, or feelings of worthlessness.

Small steps that can help:
1. Keep a basic routine (sleep, meals, light activity)
2. Short walks or sunlight exposure
3. Reach out to someone you trust

If this has lasted more than two weeks or feels heavy, a professional can help. How long have you been feeling this way?`
    }

    if (lowerMsg.includes('stress') || lowerMsg.includes('burnout')) {
      return `Stress and burnout can show up as fatigue, irritability, poor focus, and sleep problems.

Try:
1. Prioritize 1-2 key tasks daily
2. 10-minute breaks without screens
3. Protect sleep and hydration

What’s the biggest source of pressure right now?`
    }

    if (lowerMsg.includes('motivation') || lowerMsg.includes('procrastination') || lowerMsg.includes('habit')) {
      return `Motivation often follows action, not the other way around. A few practical ideas:
1. Start with a 5-minute version of the task
2. Break it into the smallest next step
3. Tie the habit to an existing routine
4. Reward completion, even if small

What are you trying to do, and where are you getting stuck?`
    }

    if (lowerMsg.includes('focus') || lowerMsg.includes('attention') || lowerMsg.includes('concentration')) {
      return `Focus improves with structure:
1. One task at a time
2. 25-minute focus blocks + 5-minute breaks
3. Reduce notifications
4. Keep a short task list (3 items max)

What kind of tasks are hardest to focus on?`
    }

    if (lowerMsg.includes('memory')) {
      return `Memory improves when information is organized and revisited:
1. Use short notes + spaced repetition
2. Sleep is essential for memory consolidation
3. Teach back what you learned in your own words

Is this about remembering names, studying, or daily tasks?`
    }

    if (lowerMsg.includes('sleep') || lowerMsg.includes('insomnia')) {
      return `Sleep issues are common. Helpful basics:
1. Keep a consistent sleep schedule
2. Limit caffeine after midday
3. Reduce screens 60 minutes before bed
4. Keep the room dark and cool

What time do you usually fall asleep and wake up?`
    }

    return `I can answer general questions about the human mind, emotions, habits, and mental well-being. 
Tell me what you’re experiencing and I’ll do my best to help with practical, low-risk guidance.`
  }

  private detectCategory(message: string): string {
    const lowerMsg = message.toLowerCase()

    // Order-related keywords
    if (lowerMsg.includes('order') || lowerMsg.includes('delivery') || lowerMsg.includes('tracking') ||
        lowerMsg.includes('track') || lowerMsg.includes('receipt') || lowerMsg.includes('invoice') ||
        lowerMsg.includes('shipped') || lowerMsg.includes('arrived') || lowerMsg.includes('where is')) {
      return 'order'
    }

    // Resale-related keywords
    if (lowerMsg.includes('resale') || lowerMsg.includes('used') || lowerMsg.includes('second hand') ||
        lowerMsg.includes('secondhand') || lowerMsg.includes('pre-owned') || lowerMsg.includes('refurbished') ||
        lowerMsg.includes('discount') || (lowerMsg.includes('cheap') && lowerMsg.includes('solar'))) {
      return 'resale'
    }

    // Trade-in keywords
    if (lowerMsg.includes('trade-in') || lowerMsg.includes('trade in') || lowerMsg.includes('exchange') ||
        lowerMsg.includes('swap old') || lowerMsg.includes('upgrade my system')) {
      return 'swap'
    }

    // Swap/marketplace keywords
    if (lowerMsg.includes('swap') || lowerMsg.includes('peer to peer') || lowerMsg.includes('marketplace')) {
      return 'swap'
    }

    // Vendor-related keywords
    if (lowerMsg.includes('vendor') || lowerMsg.includes('store') || lowerMsg.includes('seller') ||
        lowerMsg.includes('become vendor') || lowerMsg.includes('sell on') || lowerMsg.includes('list products') ||
        lowerMsg.includes('wholesale') || lowerMsg.includes('bulk order')) {
      return 'vendor'
    }

    // Installation-related keywords
    if (lowerMsg.includes('install') || lowerMsg.includes('setup') || lowerMsg.includes('quote') ||
        lowerMsg.includes('quotation') || lowerMsg.includes('engineer') || lowerMsg.includes('site') ||
        lowerMsg.includes('connect') || lowerMsg.includes('configuration') || lowerMsg.includes('wiring') ||
        lowerMsg.includes('mounting') || lowerMsg.includes('commission') || lowerMsg.includes('installer')) {
      return 'installation'
    }

    // Payment/Billing keywords
    if (lowerMsg.includes('payment') || lowerMsg.includes('bill') || lowerMsg.includes('credit') ||
        lowerMsg.includes('refund') || lowerMsg.includes('price') || lowerMsg.includes('cost') ||
        lowerMsg.includes('pay') || lowerMsg.includes('invoice') || lowerMsg.includes('installment') ||
        lowerMsg.includes('pay small small') || lowerMsg.includes('finance')) {
      return 'billing'
    }

    // Referral/Earning keywords
    if (lowerMsg.includes('referral') || lowerMsg.includes('earn') || lowerMsg.includes('commission') ||
        lowerMsg.includes('invite') || lowerMsg.includes('partner') || lowerMsg.includes('reward') ||
        lowerMsg.includes('bonus') || lowerMsg.includes('profit') || lowerMsg.includes('reseller') ||
        lowerMsg.includes('affiliate')) {
      return 'referral'
    }

    // Human mind / psychology keywords
    if (lowerMsg.includes('mind') || lowerMsg.includes('psychology') || lowerMsg.includes('mental') ||
        lowerMsg.includes('anxiety') || lowerMsg.includes('depression') || lowerMsg.includes('stress') ||
        lowerMsg.includes('burnout') || lowerMsg.includes('emotion') || lowerMsg.includes('feelings') ||
        lowerMsg.includes('motivation') || lowerMsg.includes('procrastination') || lowerMsg.includes('focus') ||
        lowerMsg.includes('attention') || lowerMsg.includes('memory') || lowerMsg.includes('sleep') ||
        lowerMsg.includes('trauma') || lowerMsg.includes('self-esteem') || lowerMsg.includes('confidence') ||
        lowerMsg.includes('adhd') || lowerMsg.includes('panic')) {
      return 'mind'
    }

    // Product inquiry keywords
    if (lowerMsg.includes('product') || lowerMsg.includes('solar') || lowerMsg.includes('panel') ||
        lowerMsg.includes('battery') || lowerMsg.includes('inverter') || lowerMsg.includes('controller') ||
        lowerMsg.includes('watt') || lowerMsg.includes('kva') || lowerMsg.includes('volt') ||
        lowerMsg.includes('amp') || lowerMsg.includes('specs') || lowerMsg.includes('recommend') ||
        lowerMsg.includes('suggest') || lowerMsg.includes('which') || lowerMsg.includes('best') ||
        lowerMsg.includes('size') || lowerMsg.includes('capacity') || lowerMsg.includes('power') ||
        lowerMsg.includes('cable') || lowerMsg.includes('bracket') || lowerMsg.includes('mounting')) {
      return 'product'
    }

    return 'general'
  }

  async clearHistory(userId: string): Promise<void> {
    await this.chatRepository.delete({ userId })
  }

  async getStats(userId: string) {
    const messages = await this.chatRepository.find({ where: { userId } })
    
    return {
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      assistantMessages: messages.filter(m => m.role === 'assistant').length,
      categories: [...new Set(messages.map(m => m.category).filter(Boolean))],
      firstMessage: messages.length > 0 ? messages[0].createdAt : null,
      lastMessage: messages.length > 0 ? messages[messages.length - 1].createdAt : null
    }
  }
}

export default new ChatService()
