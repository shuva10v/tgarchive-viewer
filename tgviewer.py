#!/usr/bin/env python

import logging
import os
import asyncio
import zipfile
from elasticsearch import AsyncElasticsearch
from elasticsearch import Elasticsearch

from fastapi import FastAPI, Response
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')

elasticsearch_url = os.environ["ELASTICSEARCH_URL"]
es_client = AsyncElasticsearch(elasticsearch_url)
es_client_sync = Elasticsearch(elasticsearch_url)
CONFIG_INDEX_NAME = "tg_archive_config"
DATA_INDEX_NAME = "tg_archive_data"

resp = es_client_sync.search(
    index=CONFIG_INDEX_NAME,
    query={"match_all": {}},
    size=1000
)
SITES = list(map(lambda x: {'id': x['_id'], 'name': x['_source']['name'], 'file_name': x['_source']['file_name']}, resp['hits']['hits']))
SITES_MAP = dict(map(lambda x: (x['id'], x['file_name']), SITES))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # for development purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/sites")
async def list_sites():
    return SITES

class SearchRequest(BaseModel):
    site_id: Optional[str] = None
    query: str
    sort: str
    skip: Optional[int] = None

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
    resp = await es_client.search(
        index=DATA_INDEX_NAME,
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
async def list_sites(site_id, media_type, media_name):
    logging.info("Requested media %s %s from %s" % (media_type, media_name, site_id))
    filename = SITES_MAP[site_id]

    with zipfile.ZipFile(filename, 'r') as archive:
        with archive.open("%s/%s" % (media_type, media_name)) as src:
            return Response(content=src.read())
