import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { Entry } from '../models/Entry';

const router = Router();
router.use(requireAuth);

// /calendar must come before /:id
router.get('/calendar', async (req: Request, res: Response) => {
  try {
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const pad   = (n: number) => String(n).padStart(2, '0');
    const startDate = `${year}-${pad(month)}-01`;
    const endDate   = `${year}-${pad(month)}-31`;

    const entries = await Entry.find({
      userId: req.user!._id,
      date: { $gte: startDate, $lte: endDate },
    }).populate('projectId', 'name color');

    const grouped: Record<string, typeof entries> = {};
    for (const e of entries) {
      if (!grouped[e.date]) grouped[e.date] = [];
      grouped[e.date].push(e);
    }
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { date, startDate, endDate, projectId, taskId } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = { userId: req.user!._id };

    if (date) {
      filter.date = date;
    } else if (startDate || endDate) {
      const d: Record<string, string> = {};
      if (startDate) d.$gte = startDate;
      if (endDate)   d.$lte = endDate;
      filter.date = d;
    }
    if (projectId) filter.projectId = projectId;
    if (taskId)    filter.taskId    = taskId;

    const entries = await Entry.find(filter)
      .populate('projectId', 'name color')
      .sort({ date: -1, createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { projectId, date, description, taskId, hours } = req.body as {
      projectId: string; date: string; description: string; taskId?: string; hours?: number;
    };
    if (!projectId || !date) {
      res.status(400).json({ error: 'projectId and date are required' });
      return;
    }
    const entry = await Entry.create({
      userId: req.user!._id, projectId, date, description: description?.trim() ?? '',
      ...(taskId ? { taskId } : {}),
      ...(hours != null && hours > 0 ? { hours } : {}),
    });
    const populated = await entry.populate('projectId', 'name color');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { description, projectId, date, hours } = req.body as Partial<{
      description: string; projectId: string; date: string; hours: number | null;
    }>;
    const entry = await Entry.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { description, projectId, date, ...(hours !== undefined ? { hours } : {}) },
      { new: true }
    ).populate('projectId', 'name color');
    if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const entry = await Entry.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
