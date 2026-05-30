import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { getStorage } from '../storage/index.js';

const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
});

export const mediaRouter = Router();
mediaRouter.use(requireAuth);

mediaRouter.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'missing_file', message: 'فایل ارسال نشده است.' });
  }
  if (!ALLOWED.has(file.mimetype.toLowerCase())) {
    return res.status(400).json({ error: 'invalid_type', message: 'فقط تصویر مجاز است.' });
  }

  try {
    const result = await getStorage().put({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
    res.json({ data: { url: result.url, key: result.key } });
  } catch (e) {
    console.error('[media] upload', e);
    res.status(500).json({ error: 'upload_failed', message: 'آپلود ناموفق بود.' });
  }
});
