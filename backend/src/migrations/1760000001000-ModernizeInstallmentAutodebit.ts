import { MigrationInterface, QueryRunner } from 'typeorm';

export class ModernizeInstallmentAutodebit1760000001000 implements MigrationInterface {
  name = 'ModernizeInstallmentAutodebit1760000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "applicationId" uuid`);
    await queryRunner.query(`ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "totalInstallments" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "monthsRemaining" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "firstPaymentReference" character varying(120)`);
    await queryRunner.query(`ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "autoDebitEnabled" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "authorizationCode" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "authorizationEmail" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "debitStartAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "nextDebitAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "lastDebitAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "installment_payments" ADD COLUMN IF NOT EXISTS "lastDebitReference" character varying(120)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_installment_nextDebitAt" ON "installment_payments" ("nextDebitAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_installment_nextDebitAt"`);
    await queryRunner.query(`ALTER TABLE "installment_payments" DROP COLUMN IF EXISTS "lastDebitReference"`);
    await queryRunner.query(`ALTER TABLE "installment_payments" DROP COLUMN IF EXISTS "lastDebitAt"`);
    await queryRunner.query(`ALTER TABLE "installment_payments" DROP COLUMN IF EXISTS "nextDebitAt"`);
    await queryRunner.query(`ALTER TABLE "installment_payments" DROP COLUMN IF EXISTS "debitStartAt"`);
    await queryRunner.query(`ALTER TABLE "installment_payments" DROP COLUMN IF EXISTS "authorizationEmail"`);
    await queryRunner.query(`ALTER TABLE "installment_payments" DROP COLUMN IF EXISTS "authorizationCode"`);
    await queryRunner.query(`ALTER TABLE "installment_payments" DROP COLUMN IF EXISTS "autoDebitEnabled"`);
    await queryRunner.query(`ALTER TABLE "installment_payments" DROP COLUMN IF EXISTS "firstPaymentReference"`);
    await queryRunner.query(`ALTER TABLE "installment_payments" DROP COLUMN IF EXISTS "monthsRemaining"`);
    await queryRunner.query(`ALTER TABLE "installment_payments" DROP COLUMN IF EXISTS "totalInstallments"`);
    await queryRunner.query(`ALTER TABLE "installment_payments" DROP COLUMN IF EXISTS "applicationId"`);
  }
}

