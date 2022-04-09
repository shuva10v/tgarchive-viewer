#!/usr/bin/env python

import logging
import os
import glob
import asyncio
import zipfile

import shutil
from fastapi import FastAPI, Response, UploadFile
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from tgindex import TgIndex

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')

elasticsearch_url = os.environ["ELASTICSEARCH_URL"]
archives_base_dir = os.environ["ARCHIVES_BASE_DIR"]

app = FastAPI()

index = TgIndex(elasticsearch_url, archives_base_dir)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # for development purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/sites")
async def list_sites():
    return index.sites

class SearchRequest(BaseModel):
    site_id: Optional[str] = None
    query: str
    sort: str
    skip: Optional[int] = None
    min_date: Optional[str] = None

class IndexRequest(BaseModel):
    file_name: str

@app.post("/search")
async def search(req: SearchRequest):
    query = {"bool": {}}
    if req.site_id is not None:
        query["bool"]["filter"] = [{
                "term": {
                    "site_id": req.site_id
                }
            }]
    if req.query != '*':
        query["bool"]["must"] =[
            {
                "query_string": {
                    "query": req.query,
                    "default_field": "text",
                    "analyzer": "russian"
                }
            }
        ]
    if req.sort == 'relevance':
        sort = ['_score']
    elif req.sort == 'date':
        sort = [{'date': {'order': 'desc'}}, '_score']
    else:
        raise Exception("Wrong sorting type")

    logging.info("Requesting data for query: %s" % query)
    resp = await index.es_client.search(
        index=index.DATA_INDEX_NAME,
        highlight={
            "fields": {
                "text": {
                    'fragmenter': 'simple'
                }
            }
        },
        query=query,
        sort=sort,
        size=10,
        from_=req.skip
    )
    def format_message(x):
        obj = x['_source']
        obj['id'] = x['_id']
        if 'highlight' in x:
            obj['highlight'] = x['highlight']['text']
        return obj

    total = resp['hits']['total']['value']

    return {'total': total, 'messages': list(map(format_message, resp['hits']['hits']))}

@app.get("/content/{site_id}/{media_type}/{media_name}")
async def get_media(site_id, media_type, media_name):
    logging.info("Requested media %s %s from %s" % (media_type, media_name, site_id))
    filename = index.sites_map[site_id]

    with zipfile.ZipFile(filename, 'r') as archive:
        with archive.open("%s/%s" % (media_type, media_name)) as src:
            return Response(content=src.read())

@app.get("/admin/archives")
async def admin_list_archives():
    return list(map(lambda x: {
        'name': os.path.basename(x),
        'size': os.path.getsize(x),
        'info': index.index_info.get(os.path.basename(x), {})
    }, glob.glob("%s/*zip" % archives_base_dir)))

@app.post("/admin/reindex")
async def admin_reindex(req: IndexRequest):
    index.index_background(req.file_name)

@app.post("/admin/upload")
async def admin_upload_file(file: UploadFile):
    full_path = "%s/%s" % (index.working_dir, file.file_name)
    if os.path.exists(full_path):
        raise Exception("Path already exists")
    with open(full_path, "wb+") as file_object:
        shutil.copyfileobj(uploaded_file.file, file_object)
