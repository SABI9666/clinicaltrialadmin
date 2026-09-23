# Clinical Trial Access — API & Admin

This repository holds the two pieces that sit behind the public website:

| Path      | What it is                                   | Runs on              |
| --------- | -------------------------------------------- | -------------------- |
| `server/` | Node + Express API, Neon Postgres, Cloud Storage | Google Cloud Run |
| `admin/`  | React admin console for editing site content  | Vercel (or Cloud Run)|

The public site lives in a separate repository,
[`clinicaltrialfrontend`](https://github.com/SABI9666/clinicaltrialfrontend),
and reads everything it renders from this API.

---

## How the pieces fit together

```
   Admin (Vercel)  ──┐
                     ├──►  API on Cloud Run  ──►  Neon Postgres (content)
   Public site ──────┘                        └►  Cloud Storage (images)
     (Vercel)
```

Every piece of text and every image on the public site is a row in Postgres.
The admin edits them; the site reads them through
`GET /api/public/site`. Nothing on the public site is hard-coded — the
frontend ships a bundled snapshot only as an offline fallback.

---

## Running it locally

No Google Cloud account is needed for local work: the API falls back to a JSON
file on disk for storage and a local folder for uploads.

```bash
cd server
cp .env.example .env          # then set JWT_SECRET and ADMIN_PASSWORD
npm install
npm start                     # http://localhost:8080
```

On first boot the API seeds all the site content and creates the admin user
from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

```bash
cd admin
npm install
npm run dev                   # http://localhost:5174, proxies /api to :8080
```

Run the API tests with:

```bash
cd server && npm test
```

---

## Configuration

`server/.env.example` documents every variable. The ones that matter most:

| Variable         | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `JWT_SECRET`     | Signs admin sessions. **Required**; at least 32 chars in prod.  |
| `CORS_ORIGINS`   | Comma-separated list of allowed origins. **Required** in prod.  |
| `USE_POSTGRES`   | `true` to use Neon Postgres. Needs `DATABASE_URL`.              |
| `DATABASE_URL`   | Neon's **pooled** connection string (host contains `-pooler`).  |
| `USE_FIRESTORE`  | Alternative backend. Not valid alongside `USE_POSTGRES`.        |
| `USE_GCS`        | `true` to upload images to Cloud Storage, `false` for local.    |
| `GCS_BUCKET`     | Bucket name for uploaded images.                                |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Creates the first admin, only when no users exist. |

With none of the backend flags set, the API stores everything in a JSON file,
so it runs locally with no database at all.

In production the API refuses to start if `JWT_SECRET` or `CORS_ORIGINS` is
missing, rather than falling back to an insecure default.

---

## Using the admin console

The console explains itself: **How-to guide** in the sidebar is a written
walkthrough of every routine job, and each editor opens with a "How this page
works" panel. What follows is the short version for whoever sets it up.

### What the menu means

The sidebar is seven headings; press one to open the pages inside it, and only
one stays open at a time. Things that are changed together are grouped
together, whether they are stored as a page section or as a list:

| Heading              | What is inside                                                        |
| -------------------- | --------------------------------------------------------------------- |
| **Overview**         | Counts, the four most common jobs, and a link to the guide.           |
| **How-to guide**     | The written walkthrough of every routine job.                         |
| **Trials**           | The trials, recruiting centres and their emails, registration deliveries, the options visitors search by, and the search wording. |
| **Insights & news**  | Reports, FAQs, News, and the headings above those tabs.               |
| **Home page**        | The rest of the home page, top to bottom.                             |
| **Enquiries**        | Where contact form messages are emailed, and whether each arrived.    |
| **Site setup**       | Header, footer, pictures, policies, and (admins only) sign-ins.       |

Menu labels and page titles are deliberately the same words, so "Pictures" in
the menu opens a page headed "Pictures".

The structure lives in `admin/src/lib/nav.js`; adding a page means adding one
entry there.

### Trials and the search filters

The public search matches a trial to a filter by exact text: a trial is only
found under "Diabetes" when its condition **is** `Diabetes`. To make that
impossible to get wrong, the trial editor offers the site's own filter options
as dropdowns rather than free-text boxes, sourced from the **Search filters**
section.

Adding a new option therefore works from either end:

- **While editing a trial** — press "+ Add a new condition" (or country, or
  state / territory) under the matching dropdown. The option is saved into
  Search filters straight away and selected for the trial in hand.
- **From Search filters** — edit all four lists in one place, then Save.

A trial whose stored value is not in the filter list (imported data, or a
stray trailing space) shows an amber warning under the dropdown with a
one-press fix that adds the tidied value to the filters and selects it.

Leaving a filter on "Not specified" is deliberate and safe: the API and the
site both treat an empty value as "not confirmed", so the trial appears
whatever the visitor searches for rather than being hidden.

### Publishing

Everything in **Content** is either Live or Draft. Untick "Published" in the
editor, or press the ● / ◯ button beside an entry in the list. ✕ deletes for
good; a draft is almost always the better choice.

"Reset to default" on a page section restores its original wording and is
limited to admins, matching the API, which rejects the call for editors.

### Registrations, centres and email

A visitor who opens a trial and presses its button gets a three-step
registration form: consent, contact details, then the trial's own screening
questions and a choice of recruiting centre.

**Nothing personal is stored.** The submission is composed into an email to
the centre the person chose and then dropped — it is never written to the
database, so the admin console has no personal data to leak, export, or erase
on request. What *is* stored is a delivery record carrying no personal data at
all: when, which trial, which centre, and whether the email got through. Without
it a failed send would vanish silently. It is shown under Trials →
Registrations.

Who edits what:

| Where | What it controls |
| ----- | ---------------- |
| Trials → **Centres & emails** | Each centre or region, and the address its registrations go to. Never exposed on the public API. |
| Trials → **All trials** → "The registration form" | Which centres recruit for that trial, the consent wording, and the screening questions. |
| Trials → **Registrations** | The delivery log. Proof it arrived, nothing more. |

The email is addressed **from your own domain**, with the registrant in
`Reply-To`. It cannot be sent *as* the registrant: their domain's SPF and DKIM
records do not authorise your server, so such a message is marked as spam or
rejected. The practical effect is the same — the centre presses Reply and
reaches the person directly, and the reply never passes through you.

#### Setting up Resend

1. Create an account at [resend.com](https://resend.com), add your sending
   domain, and add the DNS records it gives you.
2. Create an API key.
3. Set `RESEND_API_KEY` and `MAIL_FROM` on the API (see `.env.example`). On
   Cloud Run these arrive from the `clinical-trial-resend-key` secret and the
   `_MAIL_FROM` substitution — see the deploy step below.

In production, store the key as a secret rather than a plain env var:

```bash
printf '%s' "$RESEND_KEY" | \
  gcloud secrets create clinical-trial-resend-key --data-file=-
gcloud secrets add-iam-policy-binding clinical-trial-resend-key \
  --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor
```

With no key set, the flow still runs end to end: the send is logged instead,
and the Registrations page says plainly that email is not configured, so a
missing key can never look like a working mailbox.

Sending goes through `server/src/services/mail.service.js`. Every caller uses
`sendMail`, so moving to another provider means writing one more `deliver`
function rather than touching the callers.

---

## Deploying

### 1. Neon — get the connection string

In the Neon console, open your project and press **Connect**. Choose the
**Pooled connection** (the host contains `-pooler`) and copy the string:

```
postgresql://USER:PASSWORD@ep-xxxx-pooler.ap-southeast-2.aws.neon.tech/DB?sslmode=require
```

The pooled host matters: Cloud Run runs many small instances, and the direct
endpoint will exhaust Neon's connection limit under load.

Nothing else is needed in Neon — the API creates its table and indexes on
first boot, and seeds the site content.

### 2. Google Cloud — one-time setup

```bash
PROJECT_ID=clinicaltrialaccess          # must be globally unique
REGION=australia-southeast1             # Sydney, matching the Neon region
BUCKET="$PROJECT_ID-media"
BILLING_ACCOUNT=0132D6-F1ACCE-44BF57    # from Billing → Account management
ORG_ID=$(gcloud organizations list --format='value(ID)' | head -1)

# Project, inside the organisation, with billing attached
gcloud projects create "$PROJECT_ID" --organization="$ORG_ID"
gcloud config set project "$PROJECT_ID"
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"

gcloud services enable \
  run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com \
  storage.googleapis.com

# Container registry
gcloud artifacts repositories create clinical-trial \
  --repository-format=docker --location="$REGION"

# Bucket for uploaded images, publicly readable
gcloud storage buckets create "gs://$BUCKET" --location="$REGION" \
  --uniform-bucket-level-access
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member=allUsers --role=roles/storage.objectViewer

# Secrets
openssl rand -base64 48 | tr -d '\n' | \
  gcloud secrets create clinical-trial-jwt-secret --data-file=-
printf 'a-strong-first-password' | \
  gcloud secrets create clinical-trial-admin-password --data-file=-
printf '%s' "$NEON_POOLED_URL" | \
  gcloud secrets create clinical-trial-database-url --data-file=-
```

Grant the Cloud Run runtime service account access to the bucket and secrets:

```bash
SA="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"

gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$SA" --role=roles/storage.objectAdmin

for SECRET in clinical-trial-jwt-secret clinical-trial-admin-password \
  clinical-trial-database-url clinical-trial-resend-key; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor
done
```

### 3. Deploy

```bash
gcloud builds submit --config server/cloudbuild.yaml \
  --substitutions='^|^_REGION=australia-southeast1|_GCS_BUCKET=your-bucket|_ADMIN_EMAIL=you@example.com|_MAIL_FROM=registrations@your-domain.org|_CORS_ORIGINS=https://your-site.vercel.app,https://your-admin.vercel.app'
```

The leading `^|^` matters. `--substitutions` is itself comma-separated, and
shell quotes do not protect a comma from gcloud's own parser — with the usual
commas, a `_CORS_ORIGINS` holding two sites is split into a substitution and a
fragment, and the build fails on the fragment. `^|^` moves the separator to a
character the values do not contain.

`_MAIL_FROM` must be an address on the domain you verified in Resend, and the
`clinical-trial-resend-key` secret must exist before this runs. Without both,
the API comes up and the registration form still accepts people — every one of
them is recorded as undelivered and nobody is contacted.

`_ADMIN_EMAIL` and the `clinical-trial-admin-password` secret create your
sign-in for the admin console. They take effect **only while the user table is
empty**, so they matter on the first deploy and are ignored afterwards. If
either is missing no account is created, and because adding a user needs an
existing admin token there is no other way in — the API logs a warning at
startup saying exactly which one is unset.

Note the service URL it prints — both frontends need it as
`VITE_API_BASE_URL`. Check it came up with:

```bash
curl https://YOUR-SERVICE-URL/api/health   # {"status":"ok","store":"postgres",...}
```

Use `/api/health`, not `/healthz`: Google's frontend intercepts `/healthz` on
Cloud Run and answers with its own 404 before the request reaches the
container, which looks exactly like a broken deployment. The app still serves
`/healthz` for local runs and other platforms.

### 4. Sign in

Your credentials are the ones from step 2: `_ADMIN_EMAIL` and whatever you put
into the `clinical-trial-admin-password` secret. There is no default account
and no default password.

Change the password once you are in: **Users → Set password**.

## Deploying the admin to Vercel

Create a Vercel project from this repository with:

- **Root directory:** `admin`
- **Framework preset:** Vite
- **Environment variable:** `VITE_API_BASE_URL` = the Cloud Run URL
  (optionally `VITE_SITE_URL` = the public site URL, for the "View site" link)

Then add that admin URL to the API's `CORS_ORIGINS` and redeploy the API.

The admin sends `X-Robots-Tag: noindex` and is not linked from the public site,
but it is still reachable by URL — access is controlled by the sign-in, so use
a strong password and add accounts only for people who need them.

---

## Contact form enquiries

Enquiries work exactly like registrations: **nothing a person writes is
stored.** The message is emailed to the address set in the admin under
**Enquiries** — "Where enquiries are emailed" — with the sender in Reply-To,
and then discarded. That email is the only copy, so the console holds no
personal data to leak, export or erase on request.

Because there is no second copy, every failure is reported rather than
swallowed:

- **No address set** → the form refuses with a 503 and tells the visitor it is
  temporarily unavailable. Accepting a message with nowhere to put it would
  lose it silently, so an address is required, not optional.
- **The send fails** → 502, and the person is asked to try again. They are
  never thanked for a message that went nowhere.

The address is an admin-only setting rather than one of the site's content
sections. Those are all published through `/api/public/site`, so an inbox kept
there would sit in a JSON file anyone can read — the same reason a centre's
address never leaves the server.

What the Enquiries page shows is a delivery log with no personal data in it:
when, which trial the enquiry named if any, and whether the email got through.

### Enquiries stored under the old behaviour

The contact form used to save messages. Any it stored are still in the
database, and the Enquiries page shows a count of them with a button to delete
them permanently. Only the count and date range are shown — displaying the
records would put the personal details back on a screen, which is the thing
being undone.

---

## API reference

### Public (no authentication)

| Method | Path                       | Purpose                                  |
| ------ | -------------------------- | ---------------------------------------- |
| GET    | `/api/health`              | Health check (`/healthz` too, see note)  |
| GET    | `/api/public/site`         | Every section + published collections    |
| GET    | `/api/public/sections/:key`| A single section                         |
| GET    | `/api/public/trials`       | Published trials, filterable             |
| GET    | `/api/public/trials/:slug` | One trial                                |
| GET    | `/api/public/{reports,faqs,news,policies}` | Published items          |
| POST   | `/api/public/enquiries`    | Submit a contact enquiry                 |

Trial filters — `?condition=&country=&state=&age=`. A trial that records no
value for a facet is never excluded by that facet, because "not yet confirmed"
is not the same as "not eligible".

### Admin (Bearer token)

| Method | Path                                      | Purpose                |
| ------ | ----------------------------------------- | ---------------------- |
| POST   | `/api/auth/login`                         | Sign in, returns a JWT |
| GET    | `/api/auth/me`                            | Current user           |
| GET/PUT| `/api/admin/sections/:key`                | Read / save a section  |
| POST   | `/api/admin/sections/:key/reset`          | Restore the default    |
| GET/POST | `/api/admin/collections/:collection`    | List / create          |
| PUT/DELETE | `/api/admin/collections/:collection/:id` | Update / delete    |
| POST   | `/api/admin/collections/:collection/reorder` | Reorder            |
| GET/POST | `/api/admin/media`                      | List / upload images   |
| GET    | `/api/admin/enquiries`                    | Enquiry delivery log   |
| GET/PUT| `/api/admin/enquiries/settings`           | Where enquiries are emailed |
| GET/DELETE | `/api/admin/enquiries/legacy`         | Count / erase pre-change records |
| GET/POST | `/api/auth/users`                       | Manage users (admin)   |

Roles: **editor** can change content; **admin** can also manage users, set the
enquiry address, erase pre-change enquiries and reset sections.

---

## What the admin can edit

Everything visible on the public site:

- **Page sections** — site settings and banner, hero, wide banner image,
  trials section copy, search filter options, the five "Finding a trial"
  steps, "Why join", insights headings, about, contact, footer.
- **Content lists** — trials (with their detail dialog), reports, FAQs, news
  and policy documents, each with publish/draft state and ordering.
- **Images** — upload once, then pick in any section; alt text is editable.
- **Enquiries** — the address contact form messages are emailed to, and a
  delivery log. The messages themselves are never stored.
- **Users** — add editors and admins, reset passwords.

Each section can be reset to the original content from the supplied design.
