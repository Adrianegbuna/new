/**
 * Duplicate order cleanup endpoint
 * Admin only - removes duplicate orders caused by race conditions
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Order } from '../models/Order';

export const cleanupDuplicates = async (req: AuthRequest, res: Response) => {
  try {
    // ✅ Admin check
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    console.log('🧹 Starting duplicate order cleanup...');
    
    const orderRepository = AppDataSource.getRepository(Order);
    
    // Find all orders with duplicate payment references
    const duplicates = await orderRepository.query(`
      SELECT "paymentReference", "paystackReference", COUNT(*) as count
      FROM "order"
      WHERE ("paymentReference" IS NOT NULL AND "paymentReference" != '')
         OR ("paystackReference" IS NOT NULL AND "paystackReference" != '')
      GROUP BY "paymentReference", "paystackReference"
      HAVING COUNT(*) > 1
    `);
    
    console.log(`Found ${duplicates.length} payment references with duplicates`);
    
    const deletedOrders: any[] = [];
    
    for (const dup of duplicates) {
      const ref = dup.paymentReference || dup.paystackReference;
      
      // Find all orders for this payment reference
      const orders = await orderRepository.query(`
        SELECT id, "createdAt", "paymentStatus", "orderNumber", total
        FROM "order"
        WHERE ("paymentReference" = $1 OR "paystackReference" = $1)
        ORDER BY "createdAt" ASC
      `, [ref]);
      
      console.log(`  Payment ref ${ref.substring(0, 20)}...: Found ${orders.length} orders`);
      
      if (orders.length > 1) {
        // Keep the first (earliest) one
        const [first, ...toDelete] = orders;
        
        console.log(`    ✓ Keeping order ${first.id} (${first.orderNumber}, status: ${first.paymentStatus})`);
        
        for (const order of toDelete) {
          console.log(`    ✗ Deleting order ${order.id} (${order.orderNumber}, duplicate)`);
          await orderRepository.delete({ id: order.id });
          deletedOrders.push({
            id: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
            paymentRef: ref
          });
        }
      }
    }
    
    console.log(`✅ Cleanup complete! Deleted ${deletedOrders.length} duplicate orders`);
    
    res.json({
      success: true,
      message: `Deleted ${deletedOrders.length} duplicate orders`,
      deletedOrders: deletedOrders.slice(0, 20)  // Return first 20 for preview
    });
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message
    });
  }
};
