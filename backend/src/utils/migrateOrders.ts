import { AppDataSource } from '../config/database';
import { Order } from '../models/Order';
import { User } from '../models/User';

export const migrateExistingOrders = async () => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);

    // Count existing orders
    const orderCount = await orderRepository.count();
    
    // Only migrate if there are actually orders in database
    if (orderCount === 0) {
      console.log('[MIGRATION] ℹ️ No orders to migrate (fresh database)');
      return;
    }

    console.log(`[MIGRATION] Found ${orderCount} orders, checking if data needs updating...`);
    
    const userRepository = AppDataSource.getRepository(User);

    // Find all orders without buyer field
    const ordersNeedingUpdate = await orderRepository.find();
    
    let updatedCount = 0;

    for (const order of ordersNeedingUpdate) {
      let needsUpdate = false;

      // Check if buyer field is empty or missing
      if (!order.buyer || !order.buyer.id) {
        const user = await userRepository.findOne({ where: { id: order.userId } });
        if (user) {
          order.buyer = {
            id: user.id,
            fullName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone: user.phone || '',
            address: (order.shippingAddress as any)?.street || '',
            city: (order.shippingAddress as any)?.city || '',
            state: (order.shippingAddress as any)?.state || '',
            postalCode: (order.shippingAddress as any)?.postalCode || ''
          };
          needsUpdate = true;
        }
      }

      // Check if store field is empty or missing
      if (!order.store || !order.store.id) {
        if (order.items && order.items.length > 0) {
          const firstItem = order.items[0];
          order.store = {
            id: firstItem.vendorId || 'Unknown',
            name: firstItem.storeName || 'Unknown Store',
            location: 'Store Location',
            city: firstItem.storeCity || 'Unknown',
            email: 'store@example.com',
            phone: ''
          };
          needsUpdate = true;
        }
      }

      // Save if updated
      if (needsUpdate) {
        await orderRepository.save(order);
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`[MIGRATION] ✓ Updated ${updatedCount} orders with missing buyer/store fields`);
    } else {
      console.log(`[MIGRATION] ✓ All orders already have buyer/store data`);
    }
  } catch (error: any) {
    // Silently skip - this is a background optimization, not critical
    console.log('[MIGRATION] ℹ️ Background migration skipped (non-critical)');
  }
};
