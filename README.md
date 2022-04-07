# TGArchive viewer

A simple web UI for viewing telegram archives produced by [Telegram export feature](https://telegram.org/blog/export-and-more).

## Architecture

TGArchive viewer consists of three components:
1. Search index - Elasticsearch
2. Backend - python app build with [FastAPI](https://fastapi.tiangolo.com/)
3. Frontend - React+Material UI SPA

On first run one should index zip files from export. Only text content are indexed. All media (video, audio, photos) 
remains in zip files and served directly by backend app. 

## Build

Prerequisites: `docker`, `docker-compose`, `npm`.
                   
Build frontend:
```
npm install 
REACT_APP_API_ROOT=/api npm run build
```

Build docker images:
```
docker build --platform linux/amd64 -t tgarchive-backend -f backend.Dockerfile .
docker build --platform linux/amd64 -t tgarchive-frontend -f frontend.Dockerfile  .
```

## Deployment

Download Telegram archives in zip format to ./zipfile directory. 
Index all directory or specific files (If you have an error on first run, wait for a couple of minutes and retry):
```
docker-compose run --rm backend python /opt/api/tg_build_index.py /data/zipfiles/ http://elasticsearch:9200
```

Or build specific archives like this:
```
docker-compose run --rm backend python /opt/api/tg_build_index.py /data/zipfiles/archive_1.zip http://elasticsearch:9200
```

Start docker-compose:
```
docker-compose up -d
```

## Development

For development purposes it is better to use such configuration:
1. Run Elasticsearch and (optionaly) Kibana from [docker-compose-dev.yml](./docker-compose-dev.yml)
2. Run backend from cli: `ELASTICSEARCH_URL=http://localhost:9200/ uvicorn tgviewer:app --reload` 
3. Run frontend from IDEA, passing in run `npm start` configuration env vars: `REACT_APP_API_ROOT=http://localhost:8000` 










