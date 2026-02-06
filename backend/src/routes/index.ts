import { Router } from 'express';
import authRouter from './auth';
import usersRouter from './users';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Sahovat API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', authRouter);
router.use('/users', usersRouter);

// Placeholder routes for future implementation
// router.use('/fundraisers', fundraisersRouter);
// router.use('/donations', donationsRouter);
// router.use('/withdrawals', withdrawalsRouter);
// router.use('/admin', adminRouter);

export default router;
