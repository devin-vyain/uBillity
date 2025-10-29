# uBillity™
uBillity is a bill and income tracking app that I created because none of the apps I found online had the features I was looking for. It's open source, and I plan to keep it that way, but I have trademarked the app title :)

It's a Single Page Application (SPA) with a fast Django backend and modern React frontend (w/ Bootstrap 5). This is a passion project, learning endeavor, and work in progress. Feel free to setup locally and submit Pull Requests, or just fork this repository and make it your own.

Development setup instructions will be coming in the near term, and I personally plan to deploy uBillity to a production server and build a CI/CD pipeline as well

## Dev Setup
### Clone the repository
```
cd /your/directory/for/code
git clone https://github.com/devin-vyain/uBillity.git
```

### Run the backend api server via the following steps:
```
cd uBillity\uBillity
python manage.py runserver
```
Access the api via [127.0.0.1:8000/api/](url) (may differ based on localhost configuration)


### Run the frontend server via the following steps:
```
cd uBillity\uBillity\frontend
npm run dev
```
Access the frontend via [http://localhost:5173/](url) (may differ based on localhost configuration)
