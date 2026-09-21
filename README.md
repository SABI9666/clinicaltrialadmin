# Clinical Trial Access — API & Admin

This repository holds the two pieces that sit behind the public website:

| Path      | What it is                                   | Runs on              |
| --------- | -------------------------------------------- | -------------------- |
| `server/` | Node + Express API, Firestore, Cloud Storage  | Google Cloud Run     |
| `admin/`  | React admin console for editing site content  | Vercel (or Cloud Run)|

The public site lives in a separate repository,
[`clinicaltrialfrontend`](https://github.com/SABI9666/clinicaltrialfrontend),
and reads everything it renders from this API.

---

## How the pieces fit together

```
   Admin (Vercel)  ──┐
                     ├──►  API on Cloud Run  ──►  Firestore (content)
   Public site ──────┘                        └►  Cloud Storage (images)
     (Vercel)
```

Every piece of text and every image on the public site is a document in
Firestore. The admin edits those documents; the site reads them through
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
| `USE_FIRESTORE`  | `true` for Firestore, `false` for the local JSON file.          |
| `USE_GCS`        | `true` to upload images to Cloud Storage, `false` for local.    |
| `GCS_BUCKET`     | Bucket name for uploaded images.                                |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Creates the first admin, only when no users exist. |

In production the API refuses to start if `JWT_SECRET` or `CORS_ORIGINS` is
missing, rather than falling back to an insecure default.

---

## Deploying the API to Google Cloud

### One-time setup

```bash
PROJECT_ID=your-project
REGION=australia-southeast1
BUCKET=clinical-trial-media

gcloud config set project "$PROJECT_ID"

gcloud services enable \
  run.googleapis.com cloudbuild.googleapis.com \
  firestore.googleapis.com storage.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com

# Firestore in Native mode
gcloud firestore databases create --location="$REGION"

# Artifact Registry repository for the container image
gcloud artifacts repositories create clinical-trial \
  --repository-format=docker --location="$REGION"

# Bucket for uploaded images, publicly readable
gcloud storage buckets create "gs://$BUCKET" --location="$REGION" \
  --uniform-bucket-level-access
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member=allUsers --role=roles/storage.objectViewer

# Secrets
openssl rand -base64 48 | gcloud secrets create clinical-trial-jwt-secret --data-file=-
printf 'a-strong-first-password' | gcloud secrets create clinical-trial-admin-password --data-file=-
```

Grant the Cloud Run service account access to Firestore, the bucket and the
secrets (`roles/datastore.user`, `roles/storage.objectAdmin`,
`roles/secretmanager.secretAccessor`).

### Deploy

```bash
gcloud builds submit --config server/cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_GCS_BUCKET=$BUCKET,\
_CORS_ORIGINS="https://your-site.vercel.app,https://your-admin.vercel.app"
```

`server/cloudbuild.yaml` builds the image, pushes it to Artifact Registry and
deploys to Cloud Run with Firestore and Cloud Storage enabled. Note the
service URL it prints — both frontends need it.

After the first deploy, sign in to the admin and change the bootstrap
password.

---

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
| GET    | `/healthz`                 | Health check                             |
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
