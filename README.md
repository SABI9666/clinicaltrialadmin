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

for SECRET in clinical-trial-jwt-secret clinical-trial-admin-password clinical-trial-database-url; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor
done
```

### 3. Deploy

```bash
gcloud builds submit --config server/cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_GCS_BUCKET=$BUCKET,\
_ADMIN_EMAIL="you@example.com",\
_CORS_ORIGINS="https://your-site.vercel.app,https://your-admin.vercel.app"
```

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
| GET    | `/api/admin/enquiries`                    | Enquiry inbox          |
| GET/POST | `/api/auth/users`                       | Manage users (admin)   |

Roles: **editor** can change content; **admin** can also manage users, delete
enquiries and reset sections.

---

## What the admin can edit

Everything visible on the public site:

- **Page sections** — site settings and banner, hero, wide banner image,
  trials section copy, search filter options, the five "Finding a trial"
  steps, "Why join", insights headings, about, contact, footer.
- **Content lists** — trials (with their detail dialog), reports, FAQs, news
  and policy documents, each with publish/draft state and ordering.
- **Images** — upload once, then pick in any section; alt text is editable.
- **Enquiries** — inbox with status tracking and internal notes.
- **Users** — add editors and admins, reset passwords.

Each section can be reset to the original content from the supplied design.
