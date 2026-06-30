import axios from 'axios';
import cron from 'node-cron';
import { AppDataSource } from '../config/database';
import { InstallmentPayment, PaymentStatus } from '../models/InstallmentPayment';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

export const processDueInstallmentDebits = async () => {
  const installmentRepo = AppDataSource.getRepository(InstallmentPayment);
  const now = new Date();

  const candidates = await installmentRepo.find({
    where: {
      autoDebitEnabled: true
    }
  });

  const dueItems = candidates.filter((item) => {
    if (!item.nextDebitAt) return false;
    if (!item.authorizationCode || !item.authorizationEmail) return false;
    if (Number(item.remainingBalance || 0) <= 0) return false;
    if (Number(item.monthsRemaining || 0) <= 0) return false;
    return new Date(item.nextDebitAt) <= now;
  });

  let processed = 0;
  let success = 0;
  let failed = 0;
  const failures: Array<{ installmentId: string; reason: string }> = [];

  for (const installment of dueItems) {
    processed += 1;
    try {
      if (!PAYSTACK_SECRET_KEY) {
        throw new Error('Missing PAYSTACK_SECRET_KEY');
      }

      const monthly = Number(installment.monthlyAmount || 0);
      const remaining = Number(installment.remainingBalance || 0);
      const chargeAmount = Math.max(0, Math.min(monthly, remaining));
      if (chargeAmount <= 0) {
        installment.status = PaymentStatus.FULLY_CLEARED;
        installment.monthsRemaining = 0;
        installment.nextDebitAt = null as any;
        await installmentRepo.save(installment);
        success += 1;
        continue;
      }

      const reference = `RZM-DEBIT-${installment.id.substring(0, 8)}-${Date.now()}`;
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/charge_authorization`,
        {
          authorization_code: installment.authorizationCode,
          email: installment.authorizationEmail,
          amount: Math.round(chargeAmount * 100),
          reference,
          metadata: {
            paymentType: 'installment_monthly_debit',
            installmentId: installment.id,
            applicationId: installment.applicationId
          }
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const chargeData = response.data?.data;
      if (response.data?.status !== true || chargeData?.status !== 'success') {
        throw new Error(chargeData?.gateway_response || 'Charge not successful');
      }

      const newPaidAmount = Number(installment.paidAmount || 0) + chargeAmount;
      const newRemainingBalance = Math.max(0, Number(installment.remainingBalance || 0) - chargeAmount);
      const newMonthsRemaining = Math.max(0, Number(installment.monthsRemaining || 0) - 1);

      installment.paidAmount = newPaidAmount;
      installment.remainingBalance = newRemainingBalance;
      installment.monthsRemaining = newMonthsRemaining;
      installment.lastDebitAt = new Date();
      installment.lastDebitReference = chargeData.reference || reference;

      if (newRemainingBalance <= 0 || newMonthsRemaining <= 0) {
        installment.status = PaymentStatus.FULLY_CLEARED;
        installment.nextDebitAt = null as any;
      } else {
        installment.status = PaymentStatus.PARTIALLY_CLEARED;
        installment.nextDebitAt = addMonths(installment.nextDebitAt || new Date(), 1);
      }

      await installmentRepo.save(installment);
      success += 1;
    } catch (error: any) {
      failed += 1;
      failures.push({
        installmentId: installment.id,
        reason: error?.message || 'Unknown debit error'
      });
    }
  }

  return {
    processed,
    success,
    failed,
    failures
  };
};

export class InstallmentAutoDebitService {
  private static started = false;

  static startCronJobs() {
    if (this.started) return;

    // Run daily at 02:30 server time
    cron.schedule('30 2 * * *', async () => {
      try {
        const result = await processDueInstallmentDebits();
        console.log('[INSTALLMENT-AUTODEBIT] Daily run completed:', result);
      } catch (error) {
        console.error('[INSTALLMENT-AUTODEBIT] Daily run failed:', error);
      }
    });

    this.started = true;
    console.log('[INSTALLMENT-AUTODEBIT] Cron job started (daily 02:30)');
  }
}

