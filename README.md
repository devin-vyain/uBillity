# uBillity™
uBillity is a bill and income tracking app that I created because none of the apps I found online had the features I was looking for. It's open source, and I plan to keep it that way, but I have trademarked the app title :)

It's a Single Page Application (SPA) with a fast Django backend and modern React frontend (w/ Bootstrap 5). This is a passion project, learning endeavor, and work in progress. Feel free to setup locally and submit Pull Requests, or just fork this repository and make it your own.

## Dev Setup
### Backend
From the repository root, create and activate a virtual environment, install dependencies, then apply the committed migrations. Django creates the local SQLite database file automatically.

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
cd uBillity
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open the API at <http://127.0.0.1:8000/api/>. The SQLite database is local application state and is not committed; migration files in `app/migrations/` define and build the schema.

### Frontend
In a second terminal, from the repository root:

```powershell
cd uBillity\frontend
npm install
npm run dev
```

Open the frontend at <http://localhost:5173/>.

## Production Configuration
The project keeps SQLite as its default. If deploying with SQLite, set `DJANGO_SQLITE_PATH` to a file on persistent storage and run only one application instance; an ephemeral filesystem or multiple app instances can lose or conflict over database writes.

Configure these environment variables in the hosting provider before starting Django:

- `DJANGO_DEBUG=False`
- `DJANGO_SECRET_KEY` to a newly generated, private key
- `DJANGO_ALLOWED_HOSTS` to comma-separated backend host names, without schemes
- `CORS_ALLOWED_ORIGINS` to comma-separated frontend origins, including `https://`
- `CSRF_TRUSTED_ORIGINS` to the origins allowed to submit Django-protected requests
- `DJANGO_SECURE_SSL_REDIRECT=True` is enabled by default when `DJANGO_DEBUG=False`; configure the hosting proxy to forward HTTPS correctly
- `DJANGO_TRUST_X_FORWARDED_PROTO=True` only when a trusted proxy strips client-supplied `X-Forwarded-Proto` and sets it itself
- `DJANGO_SECURE_HSTS_SECONDS=31536000` only after HTTPS is working reliably

Run `python manage.py migrate` and `python manage.py collectstatic` during deployment. Build the frontend with `VITE_API_BASE_URL` set to the backend API base URL, for example `https://api.example.com/api/`. Vite embeds this value into the build, so set it before `npm run build`. Keep secrets in the hosting provider's secret store, not in Git or frontend variables.

Before exposing the app publicly, run `python manage.py check --deploy` with the production environment configured. This configuration is a starting point, not a substitute for a deployment-specific review of HTTPS proxy settings, backups, monitoring, and authentication/token storage.

## Dev Flow
```
git checkout -b your-feature-branch
```
1. Make code changes
2. Stage code changes
3. Commit code changes
4. Submit pull request from your-feature-branch to main-dev
5. After merge is approved, main-dev will be tested
6. After success, pull request from main-dev to main will be submitted
