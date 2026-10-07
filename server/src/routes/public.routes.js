import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error.js';
import {
  getPublicSite,
  getSection,
  listItems,
  listPublicCentres,
} from '../services/content.service.js';
import { submitEnquiry } from '../services/enquiries.service.js';
import { submitRegistration } from '../services/registrations.service.js';

export const publicRoutes = Router();

/** Everything the site needs to render, in one request. */
publicRoutes.get(
  '/site',
  asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(await getPublicSite());
  }),
);

publicRoutes.get(
  '/sections/:key',
  asyncHandler(async (req, res) => res.json(await getSection(req.params.key))),
);

publicRoutes.get(
  '/trials',
  asyncHandler(async (req, res) => {
    const { condition, country, state, age } = req.query;
    let trials = await listItems('trials', { publishedOnly: true });

    // Filters are progressive: a trial with no value recorded for a facet is
    // never hidden by that facet, because unconfirmed does not mean ineligible.
    if (condition) trials = trials.filter((t) => !t.condition || t.condition === condition);
    if (country) trials = trials.filter((t) => !t.country || t.country === country);
    if (state) {
      trials = trials.filter((t) => !t.states?.length || t.states.includes(state));
    }
    if (age) trials = trials.filter((t) => !t.ageRange || t.ageRange === age);

    res.json(trials);
  }),
);

publicRoutes.get(
  '/trials/:slug',
  asyncHandler(async (req, res) => {
    const trials = await listItems('trials', { publishedOnly: true });
    const trial = trials.find((t) => t.slug === req.params.slug || t.id === req.params.slug);
    if (!trial) return res.status(404).json({ error: 'Trial not found' });
    res.json(trial);
  }),
);

// Centres without their notification addresses — see listPublicCentres.
publicRoutes.get(
  '/centres',
  asyncHandler(async (req, res) => res.json(await listPublicCentres())),
);

for (const collection of ['reports', 'faqs', 'news', 'policies']) {
  publicRoutes.get(
    `/${collection}`,
    asyncHandler(async (req, res) => res.json(await listItems(collection, { publishedOnly: true }))),
  );
}

const enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many enquiries from this address. Please try again later.' },
});

const enquirySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  country: z.string().trim().min(1, 'Country is required').max(100),
  email: z.string().trim().email('Enter a valid email address').max(254),
  phone: z.string().trim().max(40).optional().default(''),
  message: z.string().trim().min(1, 'Please tell us about your enquiry').max(2000),
  trialSlug: z.string().trim().max(120).optional().default(''),
  // Honeypot: real people leave this hidden field empty. It is accepted by the
  // schema so a bot gets the same 2xx as everyone else and learns nothing.
  company: z.string().max(200).optional().default(''),
});

publicRoutes.post(
  '/enquiries',
  enquiryLimiter,
  asyncHandler(async (req, res) => {
    const body = enquirySchema.parse(req.body);
    if (body.company) return res.status(202).json({ received: true }); // silently drop bots

    // The email is the only copy — nothing here is stored — so a failure has
    // to reach the person rather than being swallowed behind a thank-you.
    await submitEnquiry(body);
    res.status(201).json({ received: true });
  }),
);

/* ------------------------- trial registrations ------------------------- */

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registrations from this address. Please try again later.' },
});

const registrationSchema = z.object({
  trialSlug: z.string().trim().min(1, 'Which trial this is for is missing').max(120),
  centreId: z.string().trim().min(1, 'Please choose a centre').max(120),
  // Consent is not a checkbox we merely record — without it there is nothing
  // lawful to pass to the centre, so the request is refused outright.
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Please tick the pre-screening consent box' }),
  }),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().email('Enter a valid email address').max(254),
  phone: z.string().trim().min(1, 'Phone number is required').max(40),
  answers: z
    .array(
      z.object({
        question: z.string().trim().max(300),
        answer: z.string().trim().max(500),
      }),
    )
    .max(30)
    .optional()
    .default([]),
  // Honeypot, as on the enquiry form.
  company: z.string().max(200).optional().default(''),
});

publicRoutes.post(
  '/registrations',
  registrationLimiter,
  asyncHandler(async (req, res) => {
    const body = registrationSchema.parse(req.body);
    if (body.company) return res.status(202).json({ received: true }); // silently drop bots

    const trials = await listItems('trials', { publishedOnly: true });
    const trial = trials.find((t) => t.slug === body.trialSlug);
    if (!trial) return res.status(404).json({ error: 'That trial is no longer listed.' });

    // A trial that names its centres may only be registered for at one of
    // them, whatever the browser posted.
    const allowed = Array.isArray(trial.centreIds) ? trial.centreIds : [];
    if (allowed.length > 0 && !allowed.includes(body.centreId)) {
      return res.status(400).json({ error: 'That centre is not recruiting for this trial.' });
    }

    await submitRegistration({
      trial,
      centreId: body.centreId,
      person: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
      },
      answers: body.answers,
    });

    res.status(201).json({ received: true });
  }),
);
