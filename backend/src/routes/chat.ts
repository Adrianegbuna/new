import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import chatController from '../controllers/chatController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// Public guest chat endpoint (no auth required)
router.post(
  '/guest-messages',
  [
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 2000 })
      .withMessage('Message must be less than 2000 characters'),
    body('sessionId')
      .notEmpty()
      .withMessage('Session ID is required')
  ],
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
  chatController.sendGuestMessage
)

// Guest chat history
router.get(
  '/guest-history',
  chatController.getGuestHistory
)

// Authenticated user chat endpoint
router.post(
  '/messages',
  authMiddleware,
  [
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 2000 })
      .withMessage('Message must be less than 2000 characters')
  ],
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
  chatController.sendMessage
)

// Protected routes - require authentication
router.use(authMiddleware)

// Get chat history
router.get(
  '/history',
  chatController.getHistory
)

// Get chat statistics
router.get(
  '/stats',
  chatController.getStats
)

// Clear chat history
router.delete(
  '/history',
  chatController.clearHistory
)

export default router
