import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-dockey-2026';
const TOKEN_COOKIE_NAME = 'auth_token';

type AuthTokenPayload = { id: string };

const getTokenFromRequest = (req: Request): string | null => {
  const cookieToken = req.cookies?.[TOKEN_COOKIE_NAME];
  if (cookieToken) return cookieToken;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
  return null;
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Save to backend/uploads
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const token = getTokenFromRequest(req);
    if (!token) {
      return cb(new Error('Unauthorized'), '');
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
      const ext = path.extname(file.originalname) || '.jpg';
      const newFilename = `avatar-${decoded.id}${ext}`;
      cb(null, newFilename);
    } catch (err) {
      cb(new Error('Invalid token'), '');
    }
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

router.post('/avatar', (req: Request, res: Response, next) => {
  upload.single('avatar')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    
    // Construct Cache-busting URL pointing to the static middleware
    const timestamp = Date.now();
    const url = `/uploads/${req.file.filename}?v=${timestamp}`;
    
    return res.json({ success: true, url });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
});

export default router;
