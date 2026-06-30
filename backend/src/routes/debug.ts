import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

const router = Router()

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs', 'errors')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

console.log('[Debug Routes] Error tracking system initialized')

/**
 * Track error logs from frontend
 */
router.post('/track-error', async (req: Request, res: Response) => {
  try {
    const { session, logs, timestamp } = req.body

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ message: 'Invalid logs format' })
    }

    // Log file path based on date
    const date = new Date().toISOString().split('T')[0]
    const logFilePath = path.join(logsDir, `errors_${date}.jsonl`)

    // Write each log as a line in JSONL format
    const logLines = logs.map((log: any) => JSON.stringify({
      ...log,
      sessionInfo: session,
      receivedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      apiVersion: '1.0',
    }))

    fs.appendFileSync(logFilePath, logLines.join('\n') + '\n')

    // Also log critical errors to console
    const criticalLogs = logs.filter((log: any) => log.severity === 'critical')
    if (criticalLogs.length > 0) {
      console.error('[CRITICAL ERRORS DETECTED]', {
        sessionId: session.sessionId,
        userId: session.userId,
        timestamp,
        logs: criticalLogs,
      })
    }

    res.status(200).json({
      message: 'Logs received successfully',
      count: logs.length,
      sessionId: session.sessionId,
    })
  } catch (error) {
    console.error('Error tracking endpoint failed:', error)
    res.status(500).json({ message: 'Failed to process error logs' })
  }
})

/**
 * Get error statistics (admin only)
 */
router.get('/error-stats', async (req: Request, res: Response) => {
  try {
    // Get last 7 days of error logs
    const errors: Record<string, number> = {}
    const today = new Date()

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const logFilePath = path.join(logsDir, `errors_${dateStr}.jsonl`)

      if (fs.existsSync(logFilePath)) {
        const content = fs.readFileSync(logFilePath, 'utf-8')
        const lines = content.split('\n').filter((line) => line.trim())
        errors[dateStr] = lines.length
      } else {
        errors[dateStr] = 0
      }
    }

    res.json({
      stats: errors,
      total: Object.values(errors).reduce((a: number, b: number) => a + b, 0),
    })
  } catch (error) {
    console.error('Error getting stats:', error)
    res.status(500).json({ message: 'Failed to get error statistics' })
  }
})

/**
 * Get recent errors (admin only)
 */
router.get('/recent-errors', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const logFilePath = path.join(logsDir, `errors_${new Date().toISOString().split('T')[0]}.jsonl`)

    if (!fs.existsSync(logFilePath)) {
      return res.json({ errors: [] })
    }

    const content = fs.readFileSync(logFilePath, 'utf-8')
    const errors = content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
      .slice(-limit)
      .reverse()

    res.json({ errors, count: errors.length })
  } catch (error) {
    console.error('Error getting recent errors:', error)
    res.status(500).json({ message: 'Failed to get recent errors' })
  }
})

/**
 * Search errors by session ID
 */
router.get('/errors-by-session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const errors: any[] = []

    // Search last 7 days
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const logFilePath = path.join(logsDir, `errors_${dateStr}.jsonl`)

      if (fs.existsSync(logFilePath)) {
        const content = fs.readFileSync(logFilePath, 'utf-8')
        const lines = content
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line))
          .filter((log) => log.sessionId === sessionId)
        errors.push(...lines)
      }
    }

    res.json({ sessionId, errors, count: errors.length })
  } catch (error) {
    console.error('Error searching by session:', error)
    res.status(500).json({ message: 'Failed to search errors' })
  }
})

/**
 * 🔧 DIAGNOSTIC: Check the actual database column definition for orders.shipping_status
 * This helps debug why status is reverting to 'processing'
 */
router.get('/check-shipping-column', async (req: Request, res: Response) => {
  try {
    const { AppDataSource } = await import('../config/database');
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // Check if the column exists and what its current default is
      const result = await queryRunner.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          table_name
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'shipping_status'
      `);

      console.log('[DIAGNOSTIC] Database column definition:', result);

      // Also fetch a sample order to see what values are actually in the database
      const sampleOrder = await queryRunner.query(`
        SELECT 
          id,
          status,
          shipping_status,
          payment_status,
          updated_at
        FROM orders
        ORDER BY updated_at DESC
        LIMIT 5
      `);

      console.log('[DIAGNOSTIC] Sample orders from database:', sampleOrder);

      res.json({
        columnDefinition: result?.[0] || null,
        sampleOrders: sampleOrder || [],
        diagnostic: {
          hasDefault: result?.[0]?.column_default ? true : false,
          defaultValue: result?.[0]?.column_default || null,
          dataType: result?.[0]?.data_type || null,
          isNullable: result?.[0]?.is_nullable || null,
        }
      });
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    console.error('[ERROR] Diagnostic check failed:', error);
    res.status(500).json({ 
      message: 'Failed to check column definition',
      error: error.message 
    });
  }
});

/**
 * 🔧 FIX: Remove the problematic DEFAULT constraint from the shipping_status column
 * Only admins should be able to call this
 */
router.patch('/fix-shipping-default', async (req: Request, res: Response) => {
  try {
    const { AppDataSource } = await import('../config/database');
    const queryRunner = AppDataSource.createQueryRunner();
    
    try {
      // Check if default exists
      const columnInfo = await queryRunner.query(`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'shipping_status'
      `);

      if (columnInfo?.[0]?.column_default) {
        console.log('[FIX] Found DEFAULT on shipping_status:', columnInfo[0].column_default);
        
        // Remove the DEFAULT constraint
        await queryRunner.query(`
          ALTER TABLE orders 
          ALTER COLUMN shipping_status DROP DEFAULT
        `);

        console.log('[FIX] Successfully removed DEFAULT from shipping_status column');

        // Verify the fix
        const afterFix = await queryRunner.query(`
          SELECT column_default
          FROM information_schema.columns
          WHERE table_name = 'orders' AND column_name = 'shipping_status'
        `);

        res.json({
          success: true,
          message: 'DEFAULT removed from shipping_status column',
          before: columnInfo[0].column_default,
          after: afterFix[0].column_default || null
        });
      } else {
        res.json({
          success: true,
          message: 'No DEFAULT constraint found on shipping_status column',
          columnDefinition: columnInfo[0] || null
        });
      }
    } finally {
      await queryRunner.release();
    }
  } catch (error: any) {
    console.error('[ERROR] Fix failed:', error);
    res.status(500).json({ 
      message: 'Failed to fix column',
      error: error.message 
    });
  }
});

export default router
