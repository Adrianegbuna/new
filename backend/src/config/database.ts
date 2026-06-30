import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { InstallerProject } from '../models/InstallerProject';
import { Referral, ReferralClick, ReferralOrder, ReferralPayout } from '../models/Referral';
import { InstallerQuotation } from '../models/InstallerQuotation';
import { InstallerServicePackage } from '../models/InstallerServicePackage';
import { InstallerJob } from '../models/InstallerJob';
import { Category } from '../models/Category';
import { SubCategory } from '../models/SubCategory';
import { SiteInquiry } from '../models/SiteInquiry';
import { ServiceRequest, ServiceRequestUpdate, ServiceNotification } from '../models/ServiceRequest';
import { Notification } from '../models/Notification';
import { Cheque } from '../models/Cheque';
import { ChequeImage } from '../models/ChequeImage';
import { Coupon } from '../models/Coupon';
import { InstallmentApplication } from '../models/InstallmentApplication';
import { InstallmentPayment } from '../models/InstallmentPayment';
import { Return } from '../models/Return';
import { Wishlist } from '../models/Wishlist';
import { Country, City } from '../models/Location';
import { StorePayoutRequest } from '../models/StorePayoutRequest';
import { Package } from '../models/Package';
import { ResaleProduct } from '../models/ResaleProduct';
import { TradeIn } from '../models/TradeIn';
import { PayoutRequest } from '../models/PayoutRequest';
import { ChatMessage } from '../models/ChatMessage';
import { ChatConversation } from '../models/ChatConversation';
import { AdminAuditLog } from '../models/AdminAuditLog';
import { Dispute } from '../models/Dispute';
import { UserAddress } from '../models/UserAddress';
import { AdBanner } from '../models/AdBanner';

config();

// Use DATABASE_URL if available, otherwise fall back to individual parameters
const dbConfig = process.env.DATABASE_URL
  ? {
      type: 'postgres' as const,
      url: process.env.DATABASE_URL,
      synchronize: process.env.DATABASE_SYNC === 'true',
      logging: process.env.NODE_ENV === 'development',
      entities: [User, Store, Product, Order, Review, InstallerProject, Referral, ReferralClick, ReferralOrder, ReferralPayout, StorePayoutRequest, InstallerQuotation, InstallerServicePackage, InstallerJob, Category, SubCategory, SiteInquiry, ServiceRequest, ServiceRequestUpdate, ServiceNotification, Notification, Cheque, ChequeImage, Coupon, InstallmentApplication, InstallmentPayment, Return, Wishlist, Country, City, Package, ResaleProduct, TradeIn, PayoutRequest, ChatMessage, ChatConversation, AdminAuditLog, Dispute, UserAddress, AdBanner],
      migrations: [__dirname + '/../migrations/*.{ts,js}'],
      subscribers: [],
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
  : {
      type: 'postgres' as const,
      host: process.env.DATABASE_HOST || '127.0.0.1',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'ecommerce_db',
      synchronize: process.env.DATABASE_SYNC === 'true',
      logging: process.env.NODE_ENV === 'development',
      entities: [User, Store, Product, Order, Review, InstallerProject, Referral, ReferralClick, ReferralOrder, ReferralPayout, StorePayoutRequest, InstallerQuotation, InstallerServicePackage, InstallerJob, Category, SubCategory, SiteInquiry, ServiceRequest, ServiceRequestUpdate, ServiceNotification, Notification, Cheque, ChequeImage, Coupon, InstallmentApplication, InstallmentPayment, Return, Wishlist, Country, City, Package, ResaleProduct, TradeIn, PayoutRequest, ChatMessage, ChatConversation, AdminAuditLog, Dispute, UserAddress, AdBanner],
      migrations: [__dirname + '/../migrations/*.{ts,js}'],
      subscribers: [],
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

export const AppDataSource = new DataSource(dbConfig as any);
