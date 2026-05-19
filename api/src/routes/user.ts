import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { User } from '../models/User';

const router = Router();

router.patch('/name', requireAuth, async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: 'Name is required' }); return; }
  try {
    await User.findByIdAndUpdate((req.user as any)._id, { name: name.trim() });
    (req.user as any).name = name.trim();
    res.json({ name: name.trim() });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
