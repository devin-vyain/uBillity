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
