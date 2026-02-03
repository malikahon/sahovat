import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Sahovat API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes will be added here
// router.use('/auth', authRouter);
// router.use('/users', usersRouter);
// router.use('/fundraisers', fundraisersRouter);
// router.use('/donations', donationsRouter);
// router.use('/withdrawals', withdrawalsRouter);
// router.use('/admin', adminRouter);

export default router;
