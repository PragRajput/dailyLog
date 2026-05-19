import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middleware/requireAuth';
import { User } from '../models/User';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

const router = Router();

router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'dailylog-avatars',
          transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
        },
        (error, result) => (error ? reject(error) : resolve(result as { secure_url: string }))
      ).end(req.file!.buffer);
    });

    await User.findByIdAndUpdate((req.user as any)._id, { avatar: result.secure_url });
    (req.user as any).avatar = result.secure_url;

    res.json({ avatar: result.secure_url });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

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
