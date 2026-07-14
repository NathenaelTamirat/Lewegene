import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '@melue/db';
import { authenticate } from '../middleware/auth';
import { getParam } from '../utils/params';

const router = Router();
router.use(authenticate);

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

const DOCUMENT_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const HEADSHOT_MIMES = ['image/jpeg', 'image/png'];

const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'];

const DOCUMENT_EXTENSIONS: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function buildStorage(subdir: string) {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      const dir = path.join(UPLOADS_DIR, subdir);
      ensureDir(dir);
      cb(null, dir);
    },
    filename(_req, file, cb) {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
}

function fileFilter(mimes: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (mimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  };
}

const docUpload = multer({
  storage: buildStorage('documents'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter(DOCUMENT_MIMES),
});

const headshotUpload = multer({
  storage: buildStorage('headshots'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter(HEADSHOT_MIMES),
});

const videoUpload = multer({
  storage: buildStorage('videos'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter(VIDEO_MIMES),
});

const DOC_TYPE_MAP: Record<string, string> = {
  BIRTH_CERTIFICATE: 'BIRTH_CERTIFICATE',
  MEDICAL_DIAGNOSIS: 'MEDICAL_DIAGNOSIS',
  AGREEMENT_DOCUMENT: 'AGREEMENT_DOCUMENT',
};

router.post(
  '/:studentId/documents',
  docUpload.array('files', 10),
  async (req: Request, res: Response) => {
    try {
      const studentId = getParam(req, 'studentId');
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) {
        res.status(404).json({ success: false, error: 'Student not found' });
        return;
      }

      const docType = (req.body.documentType as string) || 'OTHER';
      const mappedType = DOC_TYPE_MAP[docType] || 'OTHER';
      const files = req.files as Express.Multer.File[];

      if (!files?.length) {
        res.status(400).json({ success: false, error: 'No files uploaded' });
        return;
      }

      const created = await Promise.all(
        files.map((file) =>
          prisma.studentDocument.create({
            data: {
              studentId,
              type: mappedType as any,
              fileName: file.originalname,
              fileUrl: file.path,
              fileSize: file.size,
              mimeType: file.mimetype,
            },
          })
        )
      );

      res.status(201).json({ success: true, data: created });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }
);

router.post(
  '/:studentId/headshot',
  headshotUpload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const studentId = getParam(req, 'studentId');
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) {
        res.status(404).json({ success: false, error: 'Student not found' });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      await prisma.student.update({
        where: { id: studentId },
        data: { headshotUrl: file.path },
      });

      const doc = await prisma.studentDocument.create({
        data: {
          studentId,
          type: 'HEADSHOT_PHOTO',
          fileName: file.originalname,
          fileUrl: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
      });

      res.status(201).json({ success: true, data: doc });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }
);

router.post(
  '/:studentId/baseline-video',
  videoUpload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const studentId = getParam(req, 'studentId');
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) {
        res.status(404).json({ success: false, error: 'Student not found' });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      await prisma.student.update({
        where: { id: studentId },
        data: { baselineVideoUrl: file.path },
      });

      const doc = await prisma.studentDocument.create({
        data: {
          studentId,
          type: 'BASELINE_VIDEO',
          fileName: file.originalname,
          fileUrl: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
      });

      res.status(201).json({ success: true, data: doc });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }
);

router.get('/:studentId', async (req: Request, res: Response) => {
  try {
    const studentId = getParam(req, 'studentId');
    const documents = await prisma.studentDocument.findMany({
      where: { studentId },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed',
    });
  }
});

router.delete('/:fileId', async (req: Request, res: Response) => {
  try {
    const fileId = getParam(req, 'fileId');
    const doc = await prisma.studentDocument.findUnique({ where: { id: fileId } });
    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    if (fs.existsSync(doc.fileUrl)) {
      fs.unlinkSync(doc.fileUrl);
    }

    await prisma.studentDocument.delete({ where: { id: fileId } });

    if (doc.type === 'HEADSHOT_PHOTO') {
      await prisma.student.update({
        where: { id: doc.studentId },
        data: { headshotUrl: null },
      });
    } else if (doc.type === 'BASELINE_VIDEO') {
      await prisma.student.update({
        where: { id: doc.studentId },
        data: { baselineVideoUrl: null },
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed',
    });
  }
});

export { router as uploadRoutes };
