import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createUser,
  deleteUser,
  issueToken,
  listUsers,
  setPassword,
  verifyCredentials,
} from '../services/users.service.js';

export const authRoutes = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again later.' },
});

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRoutes.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    const user = await verifyCredentials(email, password);
    if (!user) return res.status(401).json({ error: 'Incorrect email or password' });
    res.json({ token: issueToken(user), user });
  }),
);

authRoutes.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.sub, email: req.user.email, role: req.user.role } });
});

authRoutes.get(
  '/users',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => res.json(await listUsers())),
);

authRoutes.post(
  '/users',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(12, 'Password must be at least 12 characters'),
        name: z.string().max(120).optional(),
        role: z.enum(['admin', 'editor']).optional(),
      })
      .parse(req.body);
    res.status(201).json(await createUser(body));
  }),
);

authRoutes.put(
  '/users/:id/password',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { password } = z
      .object({ password: z.string().min(12, 'Password must be at least 12 characters') })
      .parse(req.body);
    res.json(await setPassword(req.params.id, password));
  }),
);

authRoutes.delete(
  '/users/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => res.json(await deleteUser(req.params.id))),
);
