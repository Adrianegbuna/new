import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { InstallmentApplication, ApplicationStatus } from '../models/InstallmentApplication';
import { InstallmentPayment, PaymentStatus } from '../models/InstallmentPayment';
import { Cheque, ChequeStatus } from '../models/Cheque';
import { User, UserRole } from '../models/User';
import { Order, PaymentStatus as OrderPaymentStatus } from '../models/Order';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { emailService } from '../services/emailService';
import { validatePhoneNumber } from '../utils/phoneValidation';
import { validateEmail } from '../utils/emailValidation';
import axios from 'axios';
import { processDueInstallmentDebits } from '../services/installmentAutoDebitService';
import { NotificationService } from '../services/notificationService';
import { NotificationType } from '../models/Notification';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const normalizeText = (value: unknown): string =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isPaySmallSmallEligibleProduct = (product: Product): boolean => {
  const haystack = normalizeText(`${(product as any).category || ''} ${product.name || ''} ${(product as any).description || ''}`);
  const hasSolarPanelPhrase = haystack.includes('solar panel') || haystack.includes('solar panels');
  const hasInverterPhrase = haystack.includes('inverter') || haystack.includes('inverters');
  const hasBatteryPhrase = haystack.includes('battery') || haystack.includes('batteries');
  return hasSolarPanelPhrase || hasInverterPhrase || hasBatteryPhrase;
};

const getInstallmentMonths = (totalAmount: number): number =>
  totalAmount >= 750000 && totalAmount <= 1500000 ? 3 : 6;

const roundTo2 = (value: number): number => Math.round(value * 100) / 100;

export const processInstallmentFirstPaymentWebhook = async (transactionData: any) => {
  const metadata = transactionData?.metadata || {};
  const reference = transactionData?.reference as string | undefined;
  const looksInstallmentRef = typeof reference === 'string' && reference.startsWith('RZM-INST-');
  if (metadata.paymentType !== 'installment_first_payment' && !looksInstallmentRef) {
    return { handled: false };
  }

  const match = looksInstallmentRef ? reference?.match(/^RZM-INST-([0-9a-f-]{36})/i) : null;
  const applicationId = (metadata.applicationId as string) || match?.[1];
  if (!applicationId) {
    return { handled: true, success: false, message: 'Missing applicationId in metadata' };
  }

  const applicationRepo = AppDataSource.getRepository(InstallmentApplication);
  const installmentRepo = AppDataSource.getRepository(InstallmentPayment);
  const orderRepo = AppDataSource.getRepository(Order);

  const application = await applicationRepo.findOne({ where: { id: applicationId } });
  if (!application) {
    return { handled: true, success: false, message: 'Application not found' };
  }

  if (application.status === ApplicationStatus.PAYMENT_COMPLETED) {
    return { handled: true, success: true, message: 'Payment already processed' };
  }

  if (application.status !== ApplicationStatus.APPROVED) {
    return { handled: true, success: false, message: 'Application not approved yet' };
  }

  if (!reference) {
    return { handled: true, success: false, message: 'Missing transaction reference' };
  }

  const authorizationCode = transactionData?.authorization?.authorization_code;
  const authorizationEmail = transactionData?.customer?.email || application.email;

  let order: Order | null = null;
  try {
    order = await createOrderAndReduceStockForInstallment(application, application.userId, reference, true);
  } catch (orderError) {
    console.warn('[INSTALLMENT WEBHOOK] Order creation failed after payment success:', orderError);
  }
  const totalAmount = Number(application.totalAmount);
  const firstPayment = Number(application.firstPayment);
  const remainingBalance = Math.max(0, totalAmount - firstPayment);
  const debitStartAt = addMonths(new Date(), 1);

  let installment: InstallmentPayment | null = await installmentRepo.findOne({ where: { applicationId: application.id } });
  if (!installment) {
    installment = installmentRepo.create({
      userId: application.userId,
      orderId: order?.id || null,
      applicationId: application.id,
      paymentPlan: application.months === 3 ? '3-month' : '6-month',
      totalAmount,
      monthlyAmount: Number(application.monthlyPayment),
      paidAmount: firstPayment,
      remainingBalance,
      totalInstallments: Number(application.months),
      monthsRemaining: Number(application.months),
      customerName: application.fullName,
      customerEmail: application.email,
      customerPhone: application.phone,
      status: remainingBalance > 0 ? PaymentStatus.PARTIALLY_CLEARED : PaymentStatus.FULLY_CLEARED,
      referenceNumber: `INS-${Date.now()}-${application.userId}`,
      firstPaymentReference: reference,
      autoDebitEnabled: Boolean(authorizationCode),
      authorizationCode: authorizationCode || null,
      authorizationEmail: authorizationEmail || null,
      debitStartAt,
      nextDebitAt: remainingBalance > 0 ? debitStartAt : null
    } as Partial<InstallmentPayment>) as InstallmentPayment;
  } else {
    if (order?.id) {
      installment.orderId = order.id;
    }
    installment.paidAmount = firstPayment;
    installment.remainingBalance = remainingBalance;
    installment.totalInstallments = Number(application.months);
    installment.monthsRemaining = Number(application.months);
    installment.firstPaymentReference = reference;
    if (authorizationCode) {
      installment.autoDebitEnabled = true;
      installment.authorizationCode = authorizationCode;
      installment.authorizationEmail = authorizationEmail || installment.authorizationEmail;
    }
    installment.debitStartAt = debitStartAt;
    installment.nextDebitAt = remainingBalance > 0 ? debitStartAt : null;
    installment.status = remainingBalance > 0 ? PaymentStatus.PARTIALLY_CLEARED : PaymentStatus.FULLY_CLEARED;
  }
  await installmentRepo.save(installment as InstallmentPayment);

  if (order) {
    try {
      order.paymentStatus = OrderPaymentStatus.PAID;
      await orderRepo.save(order);
    } catch (orderError) {
      console.warn('[INSTALLMENT WEBHOOK] Failed to update order payment status:', orderError);
    }
  }

  application.status = ApplicationStatus.PAYMENT_COMPLETED;
  application.paymentReference = reference;
  application.paymentStatus = OrderPaymentStatus.PAID;
  application.firstPaymentPaid = true;
  application.firstPaymentDate = new Date();
  if (order?.id) {
    application.orderId = order.id;
  }
  await applicationRepo.save(application);

  return { handled: true, success: true };
};

export const submitInstallmentApplication = async (req: AuthRequest, res: Response) => {
  try {
    const {
      fullName,
      email,
      phone,
      address,
      employmentStatus,
      monthlyIncome,
      organization,
      bvn,
      bvnData,
      totalAmount: _clientTotalAmount,
      firstPayment: _clientFirstPayment,
      monthlyPayment: _clientMonthlyPayment,
      months: _clientMonths,
      cartItems
    } = req.body;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate required fields
    if (!fullName || !email || !phone || !address || !employmentStatus || !monthlyIncome || !bvn) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Validate BVN format (11 digits)
    if (!/^\d{11}$/.test(bvn)) {
      return res.status(400).json({ message: 'Invalid BVN format. Must be 11 digits.' });
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart items are required for Pay Small Small application' });
    }


    // Validate phone number
    const phoneValidation = validatePhoneNumber(phone, 'Nigeria');
    if (!phoneValidation.isValid) {
      return res.status(400).json({ message: phoneValidation.error || 'Invalid phone number' });
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ message: emailValidation.error || 'Invalid email address' });
    }

    // Cross-validate submitted name matches BVN name only when BVN data is provided
    if (bvnData && (bvnData.firstName || bvnData.lastName)) {
      const submittedName = fullName.toLowerCase().trim();
      const bvnFullName = `${bvnData.firstName || ''} ${bvnData.middleName || ''} ${bvnData.lastName || ''}`.toLowerCase().trim();
      
      if (bvnFullName && submittedName !== bvnFullName) {
        return res.status(400).json({ 
          message: 'Submitted name does not match BVN records. Please use the name verified from your BVN.' 
        });
      }
    }

    const productRepo = AppDataSource.getRepository(Product);
    let totalAmount = 0;
    const normalizedCartItems: any[] = [];
    const nonEligibleProducts: string[] = [];

    for (const rawItem of cartItems) {
      const productId = String(rawItem?.productId || '').trim();
      const quantity = Math.max(1, Number(rawItem?.quantity || 1));
      if (!productId) {
        return res.status(400).json({ message: 'Each cart item must include a valid productId' });
      }

      const product = await productRepo.findOne({ where: { id: productId } });
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${productId}` });
      }

      if (!isPaySmallSmallEligibleProduct(product)) {
        nonEligibleProducts.push(product.name || productId);
      }

      const unitPrice = Number(product.price || 0);
      const lineTotal = unitPrice * quantity;
      totalAmount += lineTotal;

      normalizedCartItems.push({
        productId,
        name: rawItem?.name || product.name,
        quantity,
        price: unitPrice,
        category: rawItem?.category || (product as any).category || '',
        image: rawItem?.image || product.image || ''
      });
    }

    if (nonEligibleProducts.length > 0) {
      return res.status(400).json({
        message: `Pay Small Small is only available for Solar Panels, Inverters, and Batteries. Not eligible: ${nonEligibleProducts.join(', ')}`
      });
    }

    if (totalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid total amount calculated from cart items' });
    }

    const months = getInstallmentMonths(totalAmount);
    const firstPayment = roundTo2(totalAmount * 0.5);
    const monthlyPayment = roundTo2((totalAmount - firstPayment) / months);

    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);

    const application = applicationRepo.create({
      userId,
      fullName,
      email,
      phone,
      address,
      employmentStatus,
      monthlyIncome,
      organization,
      bvn,
      bvnData,
      totalAmount,
      firstPayment,
      monthlyPayment,
      months,
      cartItems: normalizedCartItems,
      status: ApplicationStatus.PENDING
    });

    await applicationRepo.save(application);

    // Send notification email to admin
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'vmaktproject@gmail.com';
      await emailService.sendEmail({
        to: adminEmail,
        subject: 'New Installment Application - RenewableZmart',
        text: `New installment application received from ${fullName} (${email}) for ₦${totalAmount.toLocaleString()}.
        
Application Details:
- Name: ${fullName}
- Email: ${email}
- Phone: ${phone}
- Employment: ${employmentStatus}
- Monthly Income: ${monthlyIncome}
- Total Amount: ₦${totalAmount.toLocaleString()}
- First Payment: ₦${firstPayment.toLocaleString()}
- Monthly Payment: ₦${monthlyPayment.toLocaleString()} for ${months} months

Please review and approve/reject this application in the admin dashboard.`,
        html: `<h2>New Installment Application</h2>
        <p>New application received from <strong>${fullName}</strong></p>
        
        <h3>Application Details:</h3>
        <ul>
          <li><strong>Name:</strong> ${fullName}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Phone:</strong> ${phone}</li>
          <li><strong>Address:</strong> ${address}</li>
          <li><strong>Employment:</strong> ${employmentStatus}</li>
          <li><strong>Monthly Income:</strong> ${monthlyIncome}</li>
          ${organization ? `<li><strong>Organization:</strong> ${organization}</li>` : ''}
        </ul>
        
        <h3>Payment Plan:</h3>
        <ul>
          <li><strong>Total Amount:</strong> ₦${totalAmount.toLocaleString()}</li>
          <li><strong>First Payment (50%):</strong> ₦${firstPayment.toLocaleString()}</li>
          <li><strong>Monthly Payment:</strong> ₦${monthlyPayment.toLocaleString()}</li>
          <li><strong>Duration:</strong> ${months} months</li>
        </ul>
        
        <p>Please review and approve/reject this application in the admin dashboard.</p>`
      });
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
    }

    // Send confirmation email to customer
    try {
      await emailService.sendEmail({
        to: email,
        subject: 'Installment Application Received - RenewableZmart',
        text: `Dear ${fullName},

Your Pay Small Small installment application has been received and is under review.

Application Summary:
- Total Amount: ₦${totalAmount.toLocaleString()}
- First Payment (50%): ₦${firstPayment.toLocaleString()}
- Monthly Payment: ₦${monthlyPayment.toLocaleString()} for ${months} months

Our team will review your application and get back to you within 24 hours. Once approved, you'll receive a payment link to make your first payment.

Thank you for choosing RenewableZmart!`,
        html: `<h2>Application Received</h2>
        <p>Dear <strong>${fullName}</strong>,</p>
        
        <p>Your <strong>Pay Small Small</strong> installment application has been received and is under review.</p>
        
        <h3>Application Summary:</h3>
        <ul>
          <li><strong>Total Amount:</strong> ₦${totalAmount.toLocaleString()}</li>
          <li><strong>First Payment (50%):</strong> ₦${firstPayment.toLocaleString()}</li>
          <li><strong>Monthly Payment:</strong> ₦${monthlyPayment.toLocaleString()}</li>
          <li><strong>Duration:</strong> ${months} months</li>
        </ul>
        
        <p>Our team will review your application and get back to you within <strong>24 hours</strong>. Once approved, you'll receive a payment link to make your first payment.</p>
        
        <p>Thank you for choosing RenewableZmart!</p>`
      });
    } catch (emailError) {
      console.error('Failed to send customer confirmation email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Installment application submitted successfully. You will be notified within 24 hours.',
      data: {
        applicationId: application.id,
        status: application.status
      }
    });
  } catch (error: any) {
    console.error('Submit installment application error:', error);
    res.status(500).json({ message: 'Failed to submit application', error: error.message });
  }
};

export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);
    const applications = await applicationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });

    // Backfill payment state if an installment exists
    const installmentRepo = AppDataSource.getRepository(InstallmentPayment);
    for (const app of applications) {
      if (app.status !== ApplicationStatus.PAYMENT_COMPLETED) {
        const inst = await installmentRepo.findOne({ where: { applicationId: app.id } });
        if (inst && inst.firstPaymentReference) {
          app.status = ApplicationStatus.PAYMENT_COMPLETED;
          app.paymentStatus = OrderPaymentStatus.PAID;
          app.paymentReference = inst.firstPaymentReference;
          app.firstPaymentPaid = true;
          app.firstPaymentDate = app.firstPaymentDate || inst.createdAt || new Date();
          if (!app.orderId && inst.orderId) {
            app.orderId = inst.orderId;
          }
          await applicationRepo.save(app);
        }
      }
    }

    res.json({ success: true, data: applications });
  } catch (error: any) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
};

export const getAllApplications = async (req: AuthRequest, res: Response) => {
  try {
    // Verify user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: No user found in request',
        data: []
      });
    }

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Forbidden: Admin access required',
        data: []
      });
    }

    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);
    if (!applicationRepo) {
      return res.status(500).json({
        success: false,
        message: 'Database repository not initialized',
        data: []
      });
    }

    const applications = await applicationRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });

    // Backfill payment state if an installment exists
    const installmentRepo = AppDataSource.getRepository(InstallmentPayment);
    for (const app of applications) {
      if (app.status !== ApplicationStatus.PAYMENT_COMPLETED) {
        const inst = await installmentRepo.findOne({ where: { applicationId: app.id } });
        if (inst && inst.firstPaymentReference) {
          app.status = ApplicationStatus.PAYMENT_COMPLETED;
          app.paymentStatus = OrderPaymentStatus.PAID;
          app.paymentReference = inst.firstPaymentReference;
          app.firstPaymentPaid = true;
          app.firstPaymentDate = app.firstPaymentDate || inst.createdAt || new Date();
          if (!app.orderId && inst.orderId) {
            app.orderId = inst.orderId;
          }
          await applicationRepo.save(app);
        }
      }
    }

    res.json({ 
      success: true, 
      data: applications || [],
      count: applications?.length || 0
    });
  } catch (error: any) {
    console.error('Get all applications error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch applications', 
      error: error.message,
      data: []
    });
  }
};

export const getVendorInstallmentApplications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized', data: [] });
    }

    const userRepo = AppDataSource.getRepository(User);
    const requestingUser = await userRepo.findOne({ where: { id: req.user.userId } });
    if (!requestingUser?.interestedInPaySmallSmall) {
      return res.json({ success: true, data: [] });
    }

    const storeRepo = AppDataSource.getRepository(Store);
    const productRepo = AppDataSource.getRepository(Product);
    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);

    const store = await storeRepo.findOne({ where: { ownerId: req.user.userId } });
    if (!store) {
      return res.json({ success: true, data: [] });
    }

    const vendorProducts = await productRepo.find({
      where: { storeId: store.id },
      select: ['id', 'name', 'image', 'storeId', 'price']
    });

    if (!vendorProducts.length) {
      return res.json({ success: true, data: [] });
    }

    const productMap = new Map<string, Product>();
    vendorProducts.forEach((p) => productMap.set(String(p.id), p));

    const applications = await applicationRepo.find({
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });

    const filtered = applications
      .map((app) => {
        const items = Array.isArray(app.cartItems) ? app.cartItems : [];
        const vendorItems = items
          .filter((item: any) => item?.productId && productMap.has(String(item.productId)))
          .map((item: any) => {
            const product = productMap.get(String(item.productId));
            return {
              productId: item.productId,
              productName: item.name || product?.name || 'Product',
              quantity: Number(item.quantity || 1),
              price: Number(item.price || product?.price || 0),
              image: item.image || product?.image || '',
              storeId: product?.storeId || store.id
            };
          });

        if (!vendorItems.length) {
          return null;
        }

        const vendorTotal = vendorItems.reduce((sum: number, item: any) => {
          return sum + Number(item.price || 0) * Number(item.quantity || 0);
        }, 0);

        return {
          ...app,
          vendorItems,
          vendorTotal,
          vendorStoreId: store.id,
          vendorStoreName: store.name
        };
      })
      .filter(Boolean);

    res.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error('Get vendor installment applications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor installment applications', error: error.message, data: [] });
  }
};

export const approveApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);
    const application = await applicationRepo.findOne({ where: { id }, relations: ['user'] });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== ApplicationStatus.PENDING) {
      return res.status(400).json({ message: 'Application is not pending' });
    }

    application.status = ApplicationStatus.APPROVED;
    application.adminNotes = adminNotes;
    application.approvedBy = req.user?.userId;
    application.approvedAt = new Date();

    await applicationRepo.save(application);

    try {
      await NotificationService.createNotification(
        application.userId,
        NotificationType.INSTALLMENT,
        'Pay Small Small Approved',
        `Your Pay Small Small application has been approved. First payment: ₦${application.firstPayment.toLocaleString()}.`,
        { actionUrl: '/account?tab=applications' }
      );
    } catch (notifyError) {
      console.error('Failed to create approval notification:', notifyError);
    }

    // Send approval email to customer
    try {
      await emailService.sendEmail({
        to: application.email,
        subject: 'Installment Application Approved! - RenewableZmart',
        text: `Dear ${application.fullName},

Great news! Your Pay Small Small installment application has been APPROVED! 🎉

Payment Details:
- Total Amount: ₦${application.totalAmount.toLocaleString()}
- First Payment (50%): ₦${application.firstPayment.toLocaleString()}
- Monthly Payment: ₦${application.monthlyPayment.toLocaleString()} for ${application.months} months

Next Steps:
1. Log in to your account at ${process.env.FRONTEND_URL || 'http://localhost:3000'}
2. Go to "My Applications" to view your approved application
3. Click "Make First Payment" to complete your 50% down payment
4. Once payment is confirmed, your order will be processed

${adminNotes ? `\nAdmin Notes: ${adminNotes}` : ''}

Thank you for choosing RenewableZmart for your renewable energy needs!`,
        html: `<h2>🎉 Application Approved!</h2>
        <p>Dear <strong>${application.fullName}</strong>,</p>
        
        <p>Great news! Your <strong>Pay Small Small</strong> installment application has been <strong style="color: green;">APPROVED</strong>! 🎉</p>
        
        <h3>Payment Details:</h3>
        <ul>
          <li><strong>Total Amount:</strong> ₦${application.totalAmount.toLocaleString()}</li>
          <li><strong>First Payment (50%):</strong> ₦${application.firstPayment.toLocaleString()}</li>
          <li><strong>Monthly Payment:</strong> ₦${application.monthlyPayment.toLocaleString()}</li>
          <li><strong>Duration:</strong> ${application.months} months</li>
        </ul>
        
        <h3>Next Steps:</h3>
        <ol>
          <li>Log in to your account at <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">${process.env.FRONTEND_URL || 'http://localhost:3000'}</a></li>
          <li>Go to "My Applications" to view your approved application</li>
          <li>Click "Make First Payment" to complete your 50% down payment</li>
          <li>Once payment is confirmed, your order will be processed</li>
        </ol>
        
        ${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ''}
        
        <p>Thank you for choosing RenewableZmart for your renewable energy needs!</p>`
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    res.json({ success: true, message: 'Application approved successfully', data: application });
  } catch (error: any) {
    console.error('Approve application error:', error);
    res.status(500).json({ message: 'Failed to approve application', error: error.message });
  }
};

export const rejectApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);
    const application = await applicationRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== ApplicationStatus.PENDING) {
      return res.status(400).json({ message: 'Application is not pending' });
    }

    application.status = ApplicationStatus.REJECTED;
    application.adminNotes = adminNotes;
    application.rejectedBy = req.user?.userId;
    application.rejectedAt = new Date();

    await applicationRepo.save(application);

    try {
      await NotificationService.createNotification(
        application.userId,
        NotificationType.INSTALLMENT,
        'Pay Small Small Rejected',
        adminNotes
          ? `Your Pay Small Small application was not approved. Reason: ${adminNotes}`
          : 'Your Pay Small Small application was not approved.',
        { actionUrl: '/account?tab=applications' }
      );
    } catch (notifyError) {
      console.error('Failed to create rejection notification:', notifyError);
    }

    // Send rejection email to customer
    try {
      await emailService.sendEmail({
        to: application.email,
        subject: 'Installment Application Update - RenewableZmart',
        text: `Dear ${application.fullName},

Thank you for applying for our Pay Small Small installment plan.

After careful review, we regret to inform you that we are unable to approve your application at this time.

${adminNotes ? `Reason: ${adminNotes}` : ''}

You can still purchase items using our regular payment options. If you have questions or would like to discuss alternative payment options, please contact our customer support.

Thank you for your interest in RenewableZmart.`,
        html: `<h2>Application Update</h2>
        <p>Dear <strong>${application.fullName}</strong>,</p>
        
        <p>Thank you for applying for our <strong>Pay Small Small</strong> installment plan.</p>
        
        <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
        
        ${adminNotes ? `<p><strong>Reason:</strong> ${adminNotes}</p>` : ''}
        
        <p>You can still purchase items using our regular payment options. If you have questions or would like to discuss alternative payment options, please contact our customer support.</p>
        
        <p>Thank you for your interest in RenewableZmart.</p>`
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    res.json({ success: true, message: 'Application rejected', data: application });
  } catch (error: any) {
    console.error('Reject application error:', error);
    res.status(500).json({ message: 'Failed to reject application', error: error.message });
  }
};

export const updateApplicationProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { deliveryStatus, installationStatus, installedAt } = req.body || {};

    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);
    const application = await applicationRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (deliveryStatus !== undefined) {
      application.deliveryStatus = String(deliveryStatus);
    }

    if (installationStatus !== undefined) {
      application.installationStatus = String(installationStatus);
      if (String(installationStatus).toLowerCase() === 'installed' && !application.installedAt) {
        application.installedAt = new Date();
      }
    }

    if (installedAt) {
      const parsed = new Date(installedAt);
      if (!Number.isNaN(parsed.getTime())) {
        application.installedAt = parsed;
      }
    }

    await applicationRepo.save(application);

    res.json({ success: true, message: 'Application progress updated', data: application });
  } catch (error: any) {
    console.error('Update application progress error:', error);
    res.status(500).json({ message: 'Failed to update application progress', error: error.message });
  }
};

export const updateInstallmentPaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body || {};

    const normalized = String(paymentStatus || '').toLowerCase().trim();
    const allowed = ['pending', 'paid', 'completed', 'failed'];
    if (!allowed.includes(normalized)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);
    const orderRepo = AppDataSource.getRepository(Order);
    const installmentRepo = AppDataSource.getRepository(InstallmentPayment);

    const application = await applicationRepo.findOne({ where: { id } });
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    application.paymentStatus = normalized;

    if (normalized === 'paid' || normalized === 'completed') {
      application.status = ApplicationStatus.PAYMENT_COMPLETED;
      application.firstPaymentPaid = true;
      application.firstPaymentDate = application.firstPaymentDate || new Date();
    } else if (application.status === ApplicationStatus.PAYMENT_COMPLETED) {
      application.status = ApplicationStatus.APPROVED;
    }

    await applicationRepo.save(application);

    if (application.orderId) {
      const order = await orderRepo.findOne({ where: { id: application.orderId } });
      if (order) {
        order.paymentStatus = normalized as any;
        await orderRepo.save(order);
      }
    }

    const installment = await installmentRepo.findOne({ where: { applicationId: application.id } });
    if (installment) {
      if (normalized === 'paid' || normalized === 'completed') {
        installment.status = PaymentStatus.FULLY_CLEARED;
      } else if (normalized === 'failed') {
        installment.status = PaymentStatus.CANCELLED;
      } else {
        installment.status = PaymentStatus.PENDING;
      }
      await installmentRepo.save(installment);
    }

    res.json({ success: true, message: 'Payment status updated', data: application });
  } catch (error: any) {
    console.error('Update installment payment status error:', error);
    res.status(500).json({ message: 'Failed to update payment status', error: error.message });
  }
};

export const initializeInstallmentPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ message: 'Payment gateway is not configured' });
    }

    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);
    const application = await applicationRepo.findOne({ where: { id: applicationId, userId } });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== ApplicationStatus.APPROVED) {
      return res.status(400).json({ message: 'Application is not approved yet' });
    }

    // Ensure stock still exists before collecting first payment
    const productRepository = AppDataSource.getRepository(Product);
    const cartItems = Array.isArray(application.cartItems) ? application.cartItems : [];
    for (const item of cartItems) {
      if (!item?.productId || !item?.quantity) continue;
      const product = await productRepository.findOne({ where: { id: item.productId } });
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.productName || item.productId}` });
      }
      if ((product.stock || 0) < Number(item.quantity || 0)) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        });
      }
    }

    const amountInKobo = Math.round(Number(application.firstPayment) * 100);
    const reference = `RZM-INST-${application.id}-${Date.now()}`;
    const paystackPayload = {
      amount: amountInKobo,
      email: application.email,
      reference,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/account?tab=applications`,
      metadata: {
        paymentType: 'installment_first_payment',
        userId,
        applicationId: application.id
      }
    };

    const paystackResponse = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      paystackPayload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    try {
      application.paymentReference = reference;
      application.paymentStatus = OrderPaymentStatus.PENDING;
      await applicationRepo.save(application);
    } catch (saveError) {
      console.warn('[INSTALLMENT] Failed to store payment reference:', saveError);
    }

    res.json({
      success: true,
      data: {
        ...paystackResponse.data?.data,
        amount: application.firstPayment,
        email: application.email,
        applicationId: application.id
      },
      message: 'First payment initialized successfully'
    });
  } catch (error: any) {
    console.error('Initialize installment payment error:', error);
    res.status(500).json({ message: 'Failed to initialize payment', error: error.message });
  }
};

export const reconcileInstallmentPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { applicationId } = req.params;
    const requestedReference = String(req.body?.reference || '').trim();
    if (!applicationId) {
      return res.status(400).json({ message: 'Application ID is required' });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return res.status(400).json({ message: 'Payment gateway is not configured' });
    }

    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);
    const application = await applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status === ApplicationStatus.PAYMENT_COMPLETED) {
      return res.json({ success: true, message: 'Payment already completed', data: { application } });
    }

    let reference = requestedReference || application.paymentReference || '';

    if (!reference) {
      const refPrefix = `RZM-INST-${applicationId}`;
      const listResponse = await axios.get(`${PAYSTACK_BASE_URL}/transaction`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        params: { perPage: 100 }
      });
      const transactions = Array.isArray(listResponse.data?.data) ? listResponse.data.data : [];
      const match = transactions.find((tx: any) => String(tx?.reference || '').startsWith(refPrefix));
      reference = match?.reference || '';
    }

    if (!reference) {
      return res.status(404).json({ message: 'No matching Paystack transaction found for this application' });
    }

    const verifyResponse = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
    });
    const transactionData = verifyResponse.data?.data;
    if (!verifyResponse.data?.status || !transactionData) {
      return res.status(400).json({ message: 'Unable to verify Paystack transaction' });
    }
    if (String(transactionData.status || '').toLowerCase() !== 'success') {
      return res.status(400).json({ message: `Paystack transaction is ${transactionData.status || 'not successful'}` });
    }

    let result: any;
    try {
      result = await processInstallmentFirstPaymentWebhook(transactionData);
    } catch (processError: any) {
      console.error('[INSTALLMENT] Failed to process verified payment:', processError);
      return res.status(500).json({ message: processError?.message || 'Failed to process verified payment' });
    }
    if (!result?.success) {
      return res.status(400).json({ message: result?.message || 'Failed to reconcile payment' });
    }

    const refreshed = await applicationRepo.findOne({ where: { id: applicationId } });
    return res.json({ success: true, message: 'Payment reconciled', data: { application: refreshed } });
  } catch (error: any) {
    console.error('Reconcile installment payment error:', error);
    return res.status(500).json({ message: 'Failed to reconcile payment', error: error.message });
  }
};

export const autoReconcilePendingInstallments = async () => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      console.warn('[INSTALLMENT] Auto-reconcile skipped: missing PAYSTACK_SECRET_KEY');
      return { processed: 0, success: 0, failed: 0 };
    }

    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);
    const pendingApps = await applicationRepo.find({
      where: { status: ApplicationStatus.APPROVED, firstPaymentPaid: false } as any,
      order: { updatedAt: 'DESC' },
      take: 50
    });

    let processed = 0;
    let success = 0;
    let failed = 0;

    for (const app of pendingApps) {
      processed += 1;
      try {
        let reference = app.paymentReference || '';
        if (!reference) {
          const refPrefix = `RZM-INST-${app.id}`;
          const listResponse = await axios.get(`${PAYSTACK_BASE_URL}/transaction`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
            params: { perPage: 100 }
          });
          const transactions = Array.isArray(listResponse.data?.data) ? listResponse.data.data : [];
          const match = transactions.find((tx: any) => String(tx?.reference || '').startsWith(refPrefix));
          reference = match?.reference || '';
        }

        if (!reference) {
          failed += 1;
          continue;
        }

        const verifyResponse = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
        });
        const transactionData = verifyResponse.data?.data;
        if (!verifyResponse.data?.status || !transactionData || transactionData.status !== 'success') {
          failed += 1;
          continue;
        }

        const result = await processInstallmentFirstPaymentWebhook(transactionData);
        if (result?.success) {
          success += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        failed += 1;
      }
    }

    if (processed > 0) {
      console.log('[INSTALLMENT] Auto-reconcile run:', { processed, success, failed });
    }
    return { processed, success, failed };
  } catch (error) {
    console.error('[INSTALLMENT] Auto-reconcile failed:', error);
    return { processed: 0, success: 0, failed: 0 };
  }
};

const createOrderAndReduceStockForInstallment = async (
  application: InstallmentApplication,
  userId: string,
  paymentReference: string,
  allowBackorder = false
) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const userRepository = queryRunner.manager.getRepository(User);
    const productRepository = queryRunner.manager.getRepository(Product);
    const orderRepository = queryRunner.manager.getRepository(Order);
    const storeRepository = queryRunner.manager.getRepository(Store);

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const cartItems = Array.isArray(application.cartItems) ? application.cartItems : [];
    if (cartItems.length === 0) throw new Error('Application has no cart items');

    const enrichedItems: any[] = [];
    for (const rawItem of cartItems) {
      const product = await productRepository.findOne({
        where: { id: rawItem.productId },
        relations: ['store']
      });

      if (!product) throw new Error(`Product not found: ${rawItem.productId}`);
      if ((product.stock || 0) < Number(rawItem.quantity || 0)) {
        if (!allowBackorder) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        console.warn(`[INSTALLMENT] Backorder allowed for ${product.name}: ${product.stock} available, ${rawItem.quantity} requested`);
      }

      enrichedItems.push({
        productId: product.id,
        productName: rawItem.name || rawItem.productName || product.name,
        quantity: Number(rawItem.quantity || 1),
        price: Number(rawItem.price || product.price),
        image: rawItem.image || product.image || '',
        vendorId: product.store?.ownerId || '',
        storeId: product.storeId || product.store?.id || '',
        storeName: rawItem.storeName || product.store?.name || '',
        storeCity: rawItem.storeCity || product.store?.city || ''
      });
    }

    const order = new Order();
    order.userId = userId;
    order.orderNumber = `ORD-INST-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    order.items = enrichedItems;
    order.total = Number(application.totalAmount);
    order.totalPrice = Number(application.totalAmount);
    order.shippingAddress = {
      street: application.address || '',
      city: user.city || '',
      state: '',
      country: user.country || 'Nigeria',
      postalCode: ''
    };
    order.paymentReference = paymentReference;
    order.paystackReference = paymentReference;
    order.orderStatus = 'processing';
    order.paymentStatus = OrderPaymentStatus.PENDING;
    order.buyer = {
      id: user.id,
      fullName: application.fullName || `${user.firstName} ${user.lastName}`,
      email: application.email || user.email,
      phone: application.phone || user.phone || '',
      address: application.address || '',
      city: user.city || '',
      state: '',
      postalCode: ''
    };

    const savedOrder = await orderRepository.save(order);

    for (const item of enrichedItems) {
      const product = await productRepository.findOne({ where: { id: item.productId } });
      if (!product) continue;
      product.stock = Math.max(0, Number(product.stock || 0) - Number(item.quantity || 0));
      await productRepository.save(product);
    }

    const storeCountMap = new Map<string, number>();
    for (const item of enrichedItems) {
      if (!item.storeId) continue;
      storeCountMap.set(item.storeId, (storeCountMap.get(item.storeId) || 0) + Number(item.quantity || 0));
    }
    for (const [storeId, soldCount] of storeCountMap.entries()) {
      const store = await storeRepository.findOne({ where: { id: storeId } });
      if (!store) continue;
      store.totalSales = Number(store.totalSales || 0) + soldCount;
      await storeRepository.save(store);
    }

    await queryRunner.commitTransaction();

    try {
      await NotificationService.createNotification(
        user.id,
        NotificationType.ORDER,
        'Order placed',
        `Your order ${savedOrder.orderNumber} was received.`,
        { relatedId: savedOrder.id, actionUrl: '/orders' }
      );
    } catch (notifyError) {
      console.warn('[INSTALLMENT] Failed to notify customer:', notifyError);
    }

    try {
      const vendorIds = Array.from(
        new Set(enrichedItems.map((item) => item.vendorId).filter((id) => id))
      );
      await Promise.all(
        vendorIds.map((vendorId) =>
          NotificationService.createNotification(
            vendorId,
            NotificationType.ORDER,
            'New purchase request',
            `You have a new order request (${savedOrder.orderNumber}).`,
            { relatedId: savedOrder.id, actionUrl: '/vendor-dashboard?tab=orders' }
          )
        )
      );
    } catch (notifyError) {
      console.warn('[INSTALLMENT] Failed to notify vendors:', notifyError);
    }

    try {
      const adminRepo = AppDataSource.getRepository(User);
      const admins = await adminRepo.find({ where: { role: UserRole.ADMIN } });
      const title = 'New purchase request';
      const message = `Installment order ${savedOrder.orderNumber} placed by ${user.firstName} ${user.lastName} (₦${savedOrder.total}).`;
      await Promise.all(
        admins.map((admin) =>
          NotificationService.createNotification(
            admin.id,
            NotificationType.ORDER,
            title,
            message,
            { relatedId: savedOrder.id, actionUrl: '/admin/expanded-dashboard?tab=orders' }
          )
        )
      );
    } catch (notifyError) {
      console.warn('[INSTALLMENT] Failed to create admin notifications:', notifyError);
    }
    return savedOrder;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

export const verifyInstallmentFirstPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { reference } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!reference) {
      return res.status(400).json({ message: 'Payment reference is required' });
    }

    const verifyResponse = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
    });

    const transactionData = verifyResponse.data?.data;
    if (!verifyResponse.data?.status || !transactionData) {
      return res.status(400).json({ message: 'Unable to verify payment' });
    }

    if (transactionData.status !== 'success') {
      return res.status(400).json({ message: 'Payment not successful yet', data: transactionData });
    }

    const metadata = transactionData.metadata || {};
    const applicationRepo = AppDataSource.getRepository(InstallmentApplication);
    const installmentRepo = AppDataSource.getRepository(InstallmentPayment);

    let applicationId = metadata.applicationId as string | undefined;
    const paymentType = metadata.paymentType as string | undefined;
    if (paymentType && paymentType !== 'installment_first_payment') {
      return res.status(400).json({ message: 'Invalid payment type for installment verification' });
    }

    if (!applicationId) {
      const approvedApps = await applicationRepo.find({
        where: { userId, status: ApplicationStatus.APPROVED }
      });
      if (approvedApps.length === 1) {
        applicationId = approvedApps[0].id;
      } else {
        const amountNaira = Number(transactionData.amount || 0) / 100;
        const candidates = approvedApps.filter((app) => {
          const refMatch = reference.includes(app.id.substring(0, 8)) || reference.includes(app.id);
          const amountMatch = Number(app.firstPayment || 0) === amountNaira;
          return refMatch || amountMatch;
        });
        if (candidates.length === 1) {
          applicationId = candidates[0].id;
        }
      }
    }

    if (!applicationId) {
      return res.status(400).json({ message: 'Unable to identify installment application for this payment' });
    }

    const application = await applicationRepo.findOne({ where: { id: applicationId, userId } });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status === ApplicationStatus.PAYMENT_COMPLETED) {
      const existing = await installmentRepo.findOne({ where: { applicationId: application.id } });
      return res.json({ success: true, message: 'Payment already verified', data: { application, installment: existing } });
    }

    if (application.status !== ApplicationStatus.APPROVED) {
      return res.status(400).json({ message: 'Application must be approved before payment verification' });
    }

    const authorizationCode = transactionData?.authorization?.authorization_code;
    const authorizationEmail = transactionData?.customer?.email || application.email;

    const order = await createOrderAndReduceStockForInstallment(application, userId, reference, true);
    const totalAmount = Number(application.totalAmount);
    const firstPayment = Number(application.firstPayment);
    const remainingBalance = Math.max(0, totalAmount - firstPayment);
    const debitStartAt = addMonths(new Date(), 1);

    let installment: InstallmentPayment | null = await installmentRepo.findOne({ where: { applicationId: application.id } });
    if (!installment) {
      const createdInstallment = installmentRepo.create({
        userId,
        orderId: order.id,
        applicationId: application.id,
        paymentPlan: application.months === 3 ? '3-month' : '6-month',
        totalAmount,
        monthlyAmount: Number(application.monthlyPayment),
        paidAmount: firstPayment,
        remainingBalance,
        totalInstallments: Number(application.months),
        monthsRemaining: Number(application.months),
        customerName: application.fullName,
        customerEmail: application.email,
        customerPhone: application.phone,
        status: remainingBalance > 0 ? PaymentStatus.PARTIALLY_CLEARED : PaymentStatus.FULLY_CLEARED,
        referenceNumber: `INS-${Date.now()}-${userId}`,
        firstPaymentReference: reference,
        autoDebitEnabled: Boolean(authorizationCode),
        authorizationCode: authorizationCode || null,
        authorizationEmail: authorizationEmail || null,
        debitStartAt,
        nextDebitAt: remainingBalance > 0 ? debitStartAt : null
      } as Partial<InstallmentPayment>) as InstallmentPayment;
      installment = createdInstallment;
    } else {
      installment.orderId = order.id;
      installment.paidAmount = firstPayment;
      installment.remainingBalance = remainingBalance;
      installment.totalInstallments = Number(application.months);
      installment.monthsRemaining = Number(application.months);
      installment.firstPaymentReference = reference;
      installment.autoDebitEnabled = Boolean(authorizationCode);
      installment.authorizationCode = authorizationCode || null;
      installment.authorizationEmail = authorizationEmail || installment.authorizationEmail;
      installment.debitStartAt = debitStartAt;
      installment.nextDebitAt = remainingBalance > 0 ? debitStartAt : null;
      installment.status = remainingBalance > 0 ? PaymentStatus.PARTIALLY_CLEARED : PaymentStatus.FULLY_CLEARED;
    }
    await installmentRepo.save(installment as InstallmentPayment);

    try {
      const orderRepo = AppDataSource.getRepository(Order);
      order.paymentStatus = OrderPaymentStatus.PAID;
      await orderRepo.save(order);
    } catch (orderError) {
      console.warn('[INSTALLMENT] Failed to update order payment status:', orderError);
    }

    application.status = ApplicationStatus.PAYMENT_COMPLETED;
    application.paymentReference = reference;
    application.paymentStatus = OrderPaymentStatus.PAID;
    application.firstPaymentPaid = true;
    application.firstPaymentDate = new Date();
    application.orderId = order.id;
    await applicationRepo.save(application);

    try {
      await NotificationService.createNotification(
        userId,
        NotificationType.PAYMENT,
        'Payment received',
        `First installment payment received for order ${order.orderNumber || order.id}.`,
        { relatedId: order.id, actionUrl: '/orders' }
      );
    } catch (notifyError) {
      console.warn('[INSTALLMENT] Failed to notify customer of payment:', notifyError);
    }

    try {
      if (Array.isArray(order.items)) {
        const vendorIds = Array.from(
          new Set(order.items.map((item: any) => item.vendorId).filter((id: string) => id))
        );
        await Promise.all(
          vendorIds.map((vendorId) =>
            NotificationService.createNotification(
              vendorId,
              NotificationType.PAYMENT,
              'Payment received',
              `First installment payment received for order ${order.orderNumber || order.id}.`,
              { relatedId: order.id, actionUrl: '/vendor-dashboard?tab=orders' }
            )
          )
        );
      }
    } catch (notifyError) {
      console.warn('[INSTALLMENT] Failed to notify vendors of payment:', notifyError);
    }

    try {
      await emailService.sendEmail({
        to: application.email,
        subject: 'First Installment Payment Confirmed - RenewableZmart',
        html: `
          <h2>Payment Confirmed</h2>
          <p>Hi <strong>${application.fullName}</strong>,</p>
          <p>Your 50% first payment has been received successfully.</p>
          <ul>
            <li><strong>Reference:</strong> ${reference}</li>
            <li><strong>First Payment:</strong> ₦${firstPayment.toLocaleString()}</li>
            <li><strong>Monthly Debit:</strong> ₦${Number(application.monthlyPayment).toLocaleString()} x ${application.months} months</li>
            <li><strong>Next Debit Date:</strong> ${debitStartAt.toDateString()}</li>
          </ul>
          <p>Your order is now being processed. Monthly card debit will continue automatically until balance is cleared.</p>
        `
      });
    } catch (emailError) {
      console.warn('Failed to send first payment confirmation email:', emailError);
    }

    return res.json({
      success: true,
      message: 'First payment verified and monthly debit plan activated',
      data: { application, installment, orderId: order.id }
    });
  } catch (error: any) {
    console.error('Verify installment first payment error:', error);
    return res.status(500).json({ message: 'Failed to verify installment first payment', error: error.message });
  }
};

export const processDueDebitsManually = async (req: AuthRequest, res: Response) => {
  try {
    const result = await processDueInstallmentDebits();
    return res.json({
      success: true,
      message: 'Due debit processing completed',
      data: result
    });
  } catch (error: any) {
    console.error('Manual due debit processing error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process due debits', error: error.message });
  }
};

// New cheque tracking functions
export const createInstallment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      orderId,
      paymentPlan,
      totalAmount,
      monthlyAmount,
      customerName,
      customerEmail,
      customerPhone,
      cheques
    } = req.body;

    if (!orderId || !paymentPlan || !totalAmount || !cheques || cheques.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const installmentRepository = AppDataSource.getRepository(InstallmentPayment);
    const chequeRepository = AppDataSource.getRepository(Cheque);

    const installment = new InstallmentPayment();
    installment.user = user;
    installment.order = order;
    installment.paymentPlan = paymentPlan;
    installment.totalAmount = totalAmount;
    installment.monthlyAmount = monthlyAmount;
    installment.paidAmount = 0;
    installment.remainingBalance = totalAmount;
    installment.customerName = customerName;
    installment.customerEmail = customerEmail;
    installment.customerPhone = customerPhone;
    installment.status = 'pending';
    installment.referenceNumber = `INS-${Date.now()}-${userId}`;

    const savedInstallment = await installmentRepository.save(installment);

    // Create cheques
    const savedCheques: Cheque[] = [];
    for (const cheque of cheques) {
      const newCheque = new Cheque();
      newCheque.installment = savedInstallment;
      newCheque.chequeId = cheque.chequeId;
      newCheque.issueDate = new Date(cheque.issueDate);
      newCheque.amount = cheque.amount;
      newCheque.bankName = cheque.bankName;
      newCheque.accountNumber = cheque.accountNumber;
      newCheque.status = 'pending';

      const savedCheque: Cheque = await chequeRepository.save(newCheque);
      savedCheques.push(savedCheque);
    }

    // Send email to customer
    const emailContent = `
      <h2>Installment Plan Created Successfully</h2>
      <p>Dear ${customerName},</p>
      <p>Your installment plan has been created successfully.</p>
      <ul>
        <li>Payment Plan: ${paymentPlan}</li>
        <li>Total Amount: ₦${totalAmount.toLocaleString()}</li>
        <li>Monthly Amount: ₦${monthlyAmount.toLocaleString()}</li>
        <li>Reference Number: ${installment.referenceNumber}</li>
      </ul>
      <p>Please ensure all cheques are deposited on their respective due dates.</p>
    `;

    await emailService.sendEmail({
      to: customerEmail,
      subject: 'Installment Plan Created',
      html: emailContent
    });

    res.status(201).json({
      success: true,
      data: {
        installment: savedInstallment,
        cheques: savedCheques
      }
    });
  } catch (error: any) {
    console.error('Create installment error:', error);
    res.status(500).json({ message: 'Failed to create installment', error: error.message });
  }
};

export const getUserInstallments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const installmentRepository = AppDataSource.getRepository(InstallmentPayment);
    const installments = await installmentRepository.find({
      where: { user: { id: userId } },
      relations: ['order', 'cheques'],
      order: { createdAt: 'DESC' }
    });

    res.json({
      success: true,
      data: installments
    });
  } catch (error: any) {
    console.error('Get user installments error:', error);
    res.status(500).json({ message: 'Failed to get installments', error: error.message });
  }
};

export const getInstallmentDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const installmentRepository = AppDataSource.getRepository(InstallmentPayment);
    const installment = await installmentRepository.findOne({
      where: { id },
      relations: ['order', 'user', 'cheques']
    });

    if (!installment) {
      return res.status(404).json({ message: 'Installment not found' });
    }

    // Verify ownership
    if (installment.user.id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      data: installment
    });
  } catch (error: any) {
    console.error('Get installment details error:', error);
    res.status(500).json({ message: 'Failed to get installment details', error: error.message });
  }
};

export const updateChequeStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { chequeId } = req.params;
    const { status, adminNotes, clearedDate } = req.body;

    if (!['pending', 'cleared', 'bounced', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const chequeRepository = AppDataSource.getRepository(Cheque);
    const cheque = await chequeRepository.findOne({
      where: { id: chequeId },
      relations: ['installment']
    });

    if (!cheque) {
      return res.status(404).json({ message: 'Cheque not found' });
    }

    cheque.status = status as ChequeStatus;
    cheque.adminNotes = adminNotes || '';
    if (status === 'cleared') {
      cheque.clearedDate = new Date(clearedDate);
    }

    const updatedCheque = await chequeRepository.save(cheque);

    // Update installment status if all cheques are cleared
    const installmentRepository = AppDataSource.getRepository(InstallmentPayment);
    const installment = await installmentRepository.findOne({
      where: { id: cheque.installment.id },
      relations: ['cheques']
    });

    if (installment) {
      const allCheques = await chequeRepository.find({
        where: { installment: { id: installment.id } }
      });

      const clearedAmount = allCheques
        .filter(c => c.status === 'cleared')
        .reduce((sum, c) => sum + c.amount, 0);

      installment.paidAmount = clearedAmount;
      installment.remainingBalance = installment.totalAmount - clearedAmount;

      if (clearedAmount >= installment.totalAmount) {
        installment.status = 'fully_cleared';
      } else if (clearedAmount > 0) {
        installment.status = 'partially_cleared';
      }

      await installmentRepository.save(installment);
    }

    res.json({
      success: true,
      data: updatedCheque
    });
  } catch (error: any) {
    console.error('Update cheque status error:', error);
    res.status(500).json({ message: 'Failed to update cheque status', error: error.message });
  }
};

export const addChequeToInstallment = async (req: AuthRequest, res: Response) => {
  try {
    const { installmentId } = req.params;
    const { chequeId, issueDate, clearedDate, amount, bankName, accountNumber, status, adminNotes } = req.body;

    // Validate required fields
    if (!chequeId || !issueDate || !amount || !bankName) {
      return res.status(400).json({ message: 'Missing required fields (chequeId, issueDate, amount, bankName)' });
    }

    // Validate status
    if (!['pending', 'cleared', 'bounced', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // If status is cleared, clearedDate is required
    if (status === 'cleared' && !clearedDate) {
      return res.status(400).json({ message: 'Cleared date is required for cleared cheques' });
    }

    const installmentRepository = AppDataSource.getRepository(InstallmentPayment);
    const chequeRepository = AppDataSource.getRepository(Cheque);

    const installment = await installmentRepository.findOne({
      where: { id: installmentId },
      relations: ['cheques']
    });

    if (!installment) {
      return res.status(404).json({ message: 'Installment not found' });
    }

    // Check if cheque number already exists for this installment
    const existingCheque = await chequeRepository.findOne({
      where: { 
        chequeId: chequeId,
        installment: { id: installmentId }
      }
    });

    if (existingCheque) {
      return res.status(400).json({ message: 'Cheque number already exists for this installment' });
    }

    // Create new cheque
    const newCheque = new Cheque();
    newCheque.installment = installment;
    newCheque.chequeId = chequeId;
    newCheque.issueDate = new Date(issueDate);
    newCheque.amount = parseFloat(amount);
    newCheque.bankName = bankName;
    newCheque.accountNumber = accountNumber || null;
    newCheque.status = status as ChequeStatus;
    newCheque.clearedDate = status === 'cleared' ? new Date(clearedDate) : null;
    newCheque.adminNotes = adminNotes || '';

    const savedCheque = await chequeRepository.save(newCheque);

    // Update installment payment tracking if cheque is cleared
    if (status === 'cleared') {
      const allCheques = await chequeRepository.find({
        where: { installment: { id: installmentId } }
      });

      const clearedAmount = allCheques
        .filter(c => c.status === 'cleared')
        .reduce((sum, c) => sum + c.amount, 0);

      installment.paidAmount = clearedAmount;
      installment.remainingBalance = installment.totalAmount - clearedAmount;

      if (clearedAmount >= installment.totalAmount) {
        installment.status = 'fully_cleared';
      } else if (clearedAmount > 0) {
        installment.status = 'partially_cleared';
      }

      await installmentRepository.save(installment);
    }

    res.status(201).json({
      success: true,
      data: savedCheque
    });
  } catch (error: any) {
    console.error('Add cheque to installment error:', error);
    res.status(500).json({ message: 'Failed to add cheque', error: error.message });
  }
};

export const cancelInstallment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const installmentRepository = AppDataSource.getRepository(InstallmentPayment);
    const installment = await installmentRepository.findOne({
      where: { id },
      relations: ['user']
    });

    if (!installment) {
      return res.status(404).json({ message: 'Installment not found' });
    }

    if (installment.user.id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    installment.status = 'cancelled';
    const updatedInstallment = await installmentRepository.save(installment);

    res.json({
      success: true,
      data: updatedInstallment
    });
  } catch (error: any) {
    console.error('Cancel installment error:', error);
    res.status(500).json({ message: 'Failed to cancel installment', error: error.message });
  }
};

export const getInstallmentStats = async (req: AuthRequest, res: Response) => {
  try {
    const installmentRepository = AppDataSource.getRepository(InstallmentPayment);
    const chequeRepository = AppDataSource.getRepository(Cheque);

    const installments = await installmentRepository.find({
      relations: ['cheques']
    });

    const totalInstallments = installments.length;
    const activeInstallments = installments.filter(i => i.status !== 'cancelled').length;
    const totalOutstanding = installments.reduce((sum, i) => sum + i.remainingBalance, 0);
    const totalCollected = installments.reduce((sum, i) => sum + i.paidAmount, 0);
    const totalValue = installments.reduce((sum, i) => sum + i.totalAmount, 0);

    const cheques = await chequeRepository.find();
    const chequeStats = {
      total: cheques.length,
      pending: cheques.filter(c => c.status === 'pending').length,
      cleared: cheques.filter(c => c.status === 'cleared').length,
      bounced: cheques.filter(c => c.status === 'bounced').length,
      cancelled: cheques.filter(c => c.status === 'cancelled').length
    };

    res.json({
      success: true,
      data: {
        installments: {
          total: totalInstallments,
          active: activeInstallments,
          totalValue,
          totalCollected,
          totalOutstanding
        },
        cheques: chequeStats
      }
    });
  } catch (error: any) {
    console.error('Get installment stats error:', error);
    res.status(500).json({ message: 'Failed to get stats', error: error.message });
  }
};
export const getAllInstallments = async (req: AuthRequest, res: Response) => {
  try {
    const installmentRepo = AppDataSource.getRepository(InstallmentPayment);
    const orderRepo = AppDataSource.getRepository(Order);
    
    if (!installmentRepo || !orderRepo) {
      console.warn('Database repositories not initialized, returning empty array');
      return res.json({ 
        success: true,
        data: []
      });
    }

    const installments = await installmentRepo.find({
      relations: ['cheques', 'user'],
      order: { createdAt: 'DESC' }
    });

    if (!installments || installments.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Enrich installments with order and product data
    const enrichedInstallments = await Promise.all(
      installments.map(async (inst) => {
        try {
          const order = inst.orderId ? await orderRepo.findOne({
            where: { id: inst.orderId }
          }) : null;

          return {
            id: inst.id,
            orderId: inst.orderId,
            userId: inst.userId,
            customerName: inst.customerName,
            paymentPlan: inst.paymentPlan,
            totalAmount: inst.totalAmount,
            monthlyAmount: inst.monthlyAmount,
            paidAmount: inst.paidAmount,
            remainingBalance: inst.remainingBalance,
            status: inst.status,
            createdAt: inst.createdAt,
            cheques: inst.cheques || [],
            productNames: order?.items?.map((item: any) => item.productName).filter(Boolean).join(', ') || 'N/A',
            storeName: order?.items?.[0]?.storeName || 'N/A',
            orderTotal: order?.total || 0
          };
        } catch (error) {
          console.error(`Error enriching installment ${inst.id}:`, error);
          return {
            id: inst.id,
            orderId: inst.orderId,
            userId: inst.userId,
            customerName: inst.customerName,
            paymentPlan: inst.paymentPlan,
            totalAmount: inst.totalAmount,
            monthlyAmount: inst.monthlyAmount,
            paidAmount: inst.paidAmount,
            remainingBalance: inst.remainingBalance,
            status: inst.status,
            createdAt: inst.createdAt,
            cheques: inst.cheques || [],
            productNames: 'N/A',
            storeName: 'N/A',
            orderTotal: 0
          };
        }
      })
    );

    res.json({ success: true, data: enrichedInstallments });
  } catch (error: any) {
    console.error('Get all installments error:', error);
    // Return empty array instead of error to prevent 500
    res.json({ 
      success: true, 
      data: [],
      _error: error?.message || 'Unknown error'
    });
  }
};
