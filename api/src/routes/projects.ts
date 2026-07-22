import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { Project } from '../models/Project';
import { Entry } from '../models/Entry';
import { Task } from '../models/Task';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  try {
    const projects = await Project.find({ userId: req.user!._id }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body as { name: string; color?: string };
    if (!name?.trim()) { res.status(400).json({ error: 'Name is required' }); return; }
    const project = await Project.create({
      userId: req.user!._id,
      name:   name.trim(),
      color:  color || '#3b82f6',
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
    const { archived, completed, name, color } = req.body as { archived?: boolean; completed?: boolean; name?: string; color?: string };
    if (typeof archived === 'boolean') project.archived = archived;
    if (typeof completed === 'boolean') {
      project.completed = completed;
      project.completedAt = completed ? new Date() : undefined;
    }
    if (typeof name === 'string') {
      if (!name.trim()) { res.status(400).json({ error: 'Name cannot be empty' }); return; }
      project.name = name.trim();
    }
    if (typeof color === 'string' && color.trim()) project.color = color.trim();
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

    const entryCount = await Entry.countDocuments({ projectId: project._id, userId: req.user!._id });
    if (entryCount > 0) {
      res.status(400).json({ error: `Cannot delete — project has ${entryCount} log entr${entryCount === 1 ? 'y' : 'ies'}` });
      return;
    }

    const taskCount = await Task.countDocuments({ projectId: project._id, userId: req.user!._id });
    if (taskCount > 0) {
      res.status(400).json({ error: `Cannot delete — project is linked to ${taskCount} task${taskCount === 1 ? '' : 's'}` });
      return;
    }

    await project.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
