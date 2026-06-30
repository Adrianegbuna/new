/**
 * Cleanup duplicate orders caused by race condition
 * Keeps the earliest order for each payment reference, deletes the rest
 */
import { AppDataSource } from '../config/database';
import { Order } from '../models/Order';

export const cleanupDuplicateOrders = async () => {
  try {
    console.log('🧹 Starting duplicate order cleanup...');
    
    const orderRepository = AppDataSource.getRepository(Order);
    
    // Find all orders with duplicate payment references
    const duplicates = await orderRepository.query(`
      SELECT "paymentReference", "paystackReference", COUNT(*) as count
      FROM "order"
      WHERE "paymentReference" IS NOT NULL OR "paystackReference" IS NOT NULL
      GROUP BY "paymentReference", "paystackReference"
      HAVING COUNT(*) > 1
    `);
    
    console.log(`Found ${duplicates.length} payment references with duplicates`);
    
    let totalDeleted = 0;
    
    for (const dup of duplicates) {
      const ref = dup.paymentReference || dup.paystackReference;
      
      // Find all orders for this payment reference
      const orders = await orderRepository.query(`
        SELECT id, "createdAt", "paymentStatus"
        FROM "order"
        WHERE "paymentReference" = $1 OR "paystackReference" = $1
        ORDER BY "createdAt" ASC
      `, [ref]);
      
      console.log(`  Payment ref ${ref}: Found ${orders.length} orders`);
      
      if (orders.length > 1) {
        // Keep the first (earliest) one
        const [first, ...toDelete] = orders;
        
        console.log(`    Keeping order ${first.id} (created ${first.createdAt})`);
        
        for (const order of toDelete) {
          console.log(`    Deleting order ${order.id} (duplicate, created ${order.createdAt})`);
          await orderRepository.delete({ id: order.id });
          totalDeleted++;
        }
      }
    }
    
    console.log(`✅ Cleanup complete! Deleted ${totalDeleted} duplicate orders`);
    return totalDeleted;
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  }
};

// Run cleanup if called directly
if (require.main === module) {
  (async () => {
    await AppDataSource.initialize();
    const deleted = await cleanupDuplicateOrders();
    console.log(`Total orders deleted: ${deleted}`);
    process.exit(0);
  })().catch(e => {
    console.error(e);
    process.exit(1);
  });
}
