import { AppDataSource } from './src/config/database';
import { Product } from './src/models/Product';
import { Store } from './src/models/Store';
import { User } from './src/models/User';

async function seedProducts() {
  try {
    // Initialize database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepo = AppDataSource.getRepository(User);
    const storeRepo = AppDataSource.getRepository(Store);
    const productRepo = AppDataSource.getRepository(Product);

    // Create or find vendor user
    let vendor = await userRepo.findOne({ where: { email: 'vendor@renewablezmart.com' } });
    
    if (!vendor) {
      vendor = userRepo.create({
        firstName: 'Test',
        lastName: 'Vendor',
        email: 'vendor@renewablezmart.com',
        password: 'hashed_password',
        role: 'vendor',
        country: 'Nigeria',
        city: 'Lagos',
        accountType: 'vendor',
        emailVerified: true,
        isActive: true,
      });
      vendor = await userRepo.save(vendor);
      console.log('✅ Created vendor user');
    }

    // Create or find store
    let store = await storeRepo.findOne({ where: { ownerId: vendor.id } });
    
    if (!store) {
      store = storeRepo.create({
        name: 'RenewableZmart Test Store',
        description: 'Test store for renewable energy products',
        ownerId: vendor.id,
        slug: 'test-store-' + Date.now(),
        country: 'Nigeria',
        city: 'Lagos',
        isActive: true,
        isVerified: true,
        verificationStatus: 'approved',
      });
      store = await storeRepo.save(store);
      console.log('✅ Created test store');
    }

    // Check existing products
    const existingCount = await productRepo.count();
    if (existingCount > 0) {
      console.log(`✅ Database already has ${existingCount} products`);
      process.exit(0);
    }

    // Seed test products
    const testProducts = [
      {
        name: '5KW Solar Panel Kit',
        description: 'Complete 5KW solar panel installation kit with inverter and battery',
        price: 1500000,
        category: 'Solar Panels',
        subcategory: 'Complete Kits',
        stock: 10,
        country: 'Nigeria',
        city: 'Lagos',
        image: 'https://images.unsplash.com/photo-1509391366360-2e938aa1ef14?w=500&h=500&fit=crop',
        images: ['https://images.unsplash.com/photo-1509391366360-2e938aa1ef14?w=500&h=500&fit=crop'],
        approvalStatus: 'approved',
      },
      {
        name: '10KWh Battery Storage System',
        description: 'Lithium-ion battery storage for solar systems',
        price: 2000000,
        category: 'Batteries',
        subcategory: 'Energy Storage',
        stock: 5,
        country: 'Nigeria',
        city: 'Lagos',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop',
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop'],
        approvalStatus: 'approved',
      },
      {
        name: '3KW Hybrid Solar Inverter',
        description: 'Advanced hybrid inverter with built-in charge controller',
        price: 450000,
        category: 'Inverters',
        subcategory: 'Hybrid',
        stock: 15,
        country: 'Nigeria',
        city: 'Lagos',
        image: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&h=500&fit=crop',
        images: ['https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&h=500&fit=crop'],
        approvalStatus: 'approved',
      },
      {
        name: 'Solar Mounting Structure',
        description: 'Aluminum mounting rails and brackets for solar panels',
        price: 150000,
        category: 'Accessories',
        subcategory: 'Mounting',
        stock: 20,
        country: 'Nigeria',
        city: 'Lagos',
        image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b3f4?w=500&h=500&fit=crop',
        images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b3f4?w=500&h=500&fit=crop'],
        approvalStatus: 'approved',
      },
      {
        name: 'Wind Turbine Generator 3KW',
        description: 'Small-scale wind turbine for residential use',
        price: 2500000,
        category: 'Wind Power',
        subcategory: 'Wind Turbines',
        stock: 3,
        country: 'Nigeria',
        city: 'Lagos',
        image: 'https://images.unsplash.com/photo-1532996122724-8f3c2cd83c5d?w=500&h=500&fit=crop',
        images: ['https://images.unsplash.com/photo-1532996122724-8f3c2cd83c5d?w=500&h=500&fit=crop'],
        approvalStatus: 'approved',
      },
    ];

    for (const productData of testProducts) {
      const product = productRepo.create({
        ...productData,
        storeId: store.id,
        trackingId: `TST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });
      await productRepo.save(product);
    }

    console.log(`✅ Successfully seeded ${testProducts.length} test products`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedProducts();
