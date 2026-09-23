import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { config } from '../config.js';
import {
  COLLECTION_KEYS,
  SINGLETON_KEYS,
  createItem,
  deleteItem,
  getSection,
  listItems,
  reorderItems,
  resetSection,
  saveSection,
  updateItem,
} from '../services/content.service.js';
import {
  ALLOWED_MIME,
  deleteMedia,
  listMedia,
  updateMedia,
  uploadImage,
} from '../services/storage.service.js';
import {
  ENQUIRY_STATUSES,
  deleteEnquiry,
  enquiryStats,
  listEnquiries,
  updateEnquiry,
  getEnquirySettings,
  saveEnquirySettings,
} from '../services/enquiries.service.js';
import {
  deleteRegistration,
  listRegistrations,
  registrationStats,
} from '../services/registrations.service.js';
import { mailConfigured } from '../services/mail.service.js';

export const adminRoutes = Router();

// Every route below this point requires a signed-in admin or editor.
adminRoutes.use(requireAuth);

/* ---------------------------- sections ---------------------------- */

adminRoutes.get('/sections', (req, res) => res.json({ sections: SINGLETON_KEYS }));

adminRoutes.get(
  '/sections/:key',
  asyncHandler(async (req, res) => res.json(await getSection(req.params.key))),
);

adminRoutes.put(
  '/sections/:key',
  asyncHandler(async (req, res) => {
    const body = z.record(z.unknown()).parse(req.body);
    res.json(await saveSection(req.params.key, body));
  }),
);

adminRoutes.post(
  '/sections/:key/reset',
  requireRole('admin'),
  asyncHandler(async (req, res) => res.json(await resetSection(req.params.key))),
);

/* --------------------------- collections --------------------------- */

const imageSchema = z
  .object({
    src: z.string().max(2048).optional().default(''),
    webp: z.string().max(2048).optional(),
    alt: z.string().max(300).optional().default(''),
  })
  .partial();

const ctaSchema = z
  .object({
    label: z.string().max(120).optional().default(''),
    href: z.string().max(500).optional().default(''),
    icon: z.string().max(8).optional(),
  })
  .partial();

const trialSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only'),
  title: z.string().trim().min(1).max(200),
  tag: z.string().max(120).optional().default(''),
  condition: z.string().max(120).optional().default(''),
  country: z.string().max(120).optional().default(''),
  states: z.array(z.string().max(120)).optional().default([]),
  ageRange: z.string().max(60).optional().default(''),
  featured: z.boolean().optional().default(false),
  published: z.boolean().optional().default(true),
  order: z.number().int().optional(),
  summary: z.array(z.string().max(2000)).optional().default([]),
  image: imageSchema.optional().default({}),
  learnMoreLabel: z.string().max(120).optional().default('Learn more about this trial ↗'),
  // Which centres recruit for this trial. Empty means every published centre.
  centreIds: z.array(z.string().max(120)).optional().default([]),
  registration: z
    .object({
      enabled: z.boolean().optional().default(true),
      intro: z.string().max(2000).optional().default(''),
      consentLabel: z.string().max(500).optional().default(''),
      consentBody: z.string().max(4000).optional().default(''),
      centreLabel: z.string().max(200).optional().default(''),
      successMessage: z.string().max(2000).optional().default(''),
      questions: z
        .array(
          z.object({
            question: z.string().max(300).optional().default(''),
            helpText: z.string().max(500).optional().default(''),
            options: z.array(z.string().max(200)).optional().default([]),
          }),
        )
        .max(30)
        .optional()
        .default([]),
    })
    .partial()
    .optional()
    .default({}),
  detail: z
    .object({
      eyebrow: z.string().max(120).optional().default(''),
      title: z.string().max(200).optional().default(''),
      tag: z.string().max(120).optional().default(''),
      paragraphs: z.array(z.string().max(4000)).optional().default([]),
      note: z.string().max(2000).optional().default(''),
      ctaLabel: z.string().max(120).optional().default(''),
      enquiryPrefill: z.string().max(1000).optional().default(''),
    })
    .partial()
    .optional()
    .default({}),
});

/** A recruiting centre. The email is where its registrations are sent. */
const centreSchema = z.object({
  name: z.string().trim().min(1).max(200),
  region: z.string().max(120).optional().default(''),
  email: z
    .string()
    .trim()
    .max(254)
    .refine((v) => v === '' || z.string().email().safeParse(v).success, {
      message: 'Enter a valid email address, or leave it empty until you have one',
    })
    .optional()
    .default(''),
  published: z.boolean().optional().default(true),
  order: z.number().int().optional(),
});

const reportSchema = z.object({
  eyebrow: z.string().max(120).optional().default(''),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(4000).optional().default(''),
  footnote: z.string().max(500).optional().default(''),
  published: z.boolean().optional().default(true),
  order: z.number().int().optional(),
});

const faqSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().max(4000).optional().default(''),
  published: z.boolean().optional().default(true),
  order: z.number().int().optional(),
});

const newsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().max(2000).optional().default(''),
  body: z.string().max(20000).optional().default(''),
  date: z.string().max(40).optional().default(''),
  image: imageSchema.optional().default({}),
  published: z.boolean().optional().default(true),
  order: z.number().int().optional(),
});

const policySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only'),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(40000).optional().default(''),
  published: z.boolean().optional().default(true),
  order: z.number().int().optional(),
});

const SCHEMAS = {
  trials: trialSchema,
  reports: reportSchema,
  faqs: faqSchema,
  news: newsSchema,
  policies: policySchema,
  centres: centreSchema,
};

adminRoutes.get('/collections', (req, res) => res.json({ collections: COLLECTION_KEYS }));

adminRoutes.get(
  '/collections/:collection',
  asyncHandler(async (req, res) => res.json(await listItems(req.params.collection))),
);

adminRoutes.post(
  '/collections/:collection',
  asyncHandler(async (req, res) => {
    const schema = SCHEMAS[req.params.collection];
    if (!schema) return res.status(404).json({ error: 'Unknown collection' });
    res.status(201).json(await createItem(req.params.collection, schema.parse(req.body)));
  }),
);

adminRoutes.put(
  '/collections/:collection/:id',
  asyncHandler(async (req, res) => {
    const schema = SCHEMAS[req.params.collection];
    if (!schema) return res.status(404).json({ error: 'Unknown collection' });
    // partial() so the admin can PATCH-style save a single field.
    res.json(await updateItem(req.params.collection, req.params.id, schema.partial().parse(req.body)));
  }),
);

adminRoutes.post(
  '/collections/:collection/reorder',
  asyncHandler(async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.string()) }).parse(req.body);
    res.json(await reorderItems(req.params.collection, ids));
  }),
);

adminRoutes.delete(
  '/collections/:collection/:id',
  asyncHandler(async (req, res) => res.json(await deleteItem(req.params.collection, req.params.id))),
);

/* ------------------------------ media ------------------------------ */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(Object.assign(new Error(`Unsupported image type: ${file.mimetype}`), { status: 415 }));
    }
    cb(null, true);
  },
});

adminRoutes.get(
  '/media',
  asyncHandler(async (req, res) => res.json(await listMedia())),
);

adminRoutes.post(
  '/media',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const media = await uploadImage({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      alt: req.body.alt ?? '',
      uploadedBy: req.user.email ?? '',
    });
    res.status(201).json(media);
  }),
);

adminRoutes.put(
  '/media/:id',
  asyncHandler(async (req, res) => {
    const body = z.object({ alt: z.string().max(300) }).parse(req.body);
    res.json(await updateMedia(req.params.id, body));
  }),
);

adminRoutes.delete(
  '/media/:id',
  asyncHandler(async (req, res) => res.json(await deleteMedia(req.params.id))),
);

/* ---------------------------- enquiries ---------------------------- */

adminRoutes.get(
  '/enquiries',
  asyncHandler(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(ENQUIRY_STATUSES).optional() })
      .parse(req.query);
    res.json(await listEnquiries({ status }));
  }),
);

adminRoutes.get(
  '/enquiries/stats',
  asyncHandler(async (req, res) => res.json(await enquiryStats())),
);

/* Both must be declared before '/enquiries/:id', or Express matches
 * "settings" as an id and the update handler runs instead. */
adminRoutes.get(
  '/enquiries/settings',
  asyncHandler(async (req, res) => res.json(await getEnquirySettings())),
);

adminRoutes.put(
  '/enquiries/settings',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        // Empty is allowed and means "do not send notifications", which is how
        // this is turned off without deleting the address you had.
        notifyEmail: z
          .string()
          .trim()
          .max(254)
          .refine((v) => v === '' || z.string().email().safeParse(v).success, {
            message: 'Enter a valid email address, or leave it empty to turn notifications off',
          }),
      })
      .parse(req.body);
    res.json(await saveEnquirySettings(body));
  }),
);

adminRoutes.put(
  '/enquiries/:id',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        status: z.enum(ENQUIRY_STATUSES).optional(),
        notes: z.string().max(4000).optional(),
      })
      .parse(req.body);
    res.json(await updateEnquiry(req.params.id, body));
  }),
);

adminRoutes.delete(
  '/enquiries/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => res.json(await deleteEnquiry(req.params.id))),
);

/* --------------------------- registrations --------------------------- */

/*
 * The delivery log. It carries no personal data at all — registrations are
 * emailed to the centre and never stored — so this answers "did it arrive?",
 * not "who registered?".
 */
adminRoutes.get(
  '/registrations',
  asyncHandler(async (req, res) => res.json(await listRegistrations())),
);

adminRoutes.get(
  '/registrations/stats',
  asyncHandler(async (req, res) =>
    res.json({ ...(await registrationStats()), mailConfigured: mailConfigured() }),
  ),
);

adminRoutes.delete(
  '/registrations/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => res.json(await deleteRegistration(req.params.id))),
);
