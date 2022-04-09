#!/usr/bin/env python

import logging
from elasticsearch import AsyncElasticsearch
from elasticsearch import Elasticsearch
import zipfile
import json
from threading import Thread
import traceback

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')
logging.getLogger('urllib3').setLevel(logging.INFO)

class SystemBusyException(Exception):
    pass

def validate_file(zip, filename):
    try:
        zip.getinfo(filename)
    except KeyError:
        logging.error("File name %s is missing" % (filename))
        return "broken"
    return filename

class TgIndex:
    CONFIG_INDEX_NAME = "tg_archive_config"
    DATA_INDEX_NAME = "tg_archive_data"

    def __init__(self, elasticsearch_url, working_dir = None):
        self.elasticsearch_url = elasticsearch_url
        self.es_client = AsyncElasticsearch(elasticsearch_url)
        self.es_client_sync = Elasticsearch(elasticsearch_url)

        self.thread = None
        self.index_info = {}
        self.working_dir = working_dir

        if not self.es_client_sync.indices.exists(index=TgIndex.DATA_INDEX_NAME):
            self.es_client_sync.indices.create(
                index=TgIndex.DATA_INDEX_NAME,
                body={
                    "settings": {
                        "analysis": {
                            "analyzer": {
                                "default": {
                                    "type": "russian"
                                }
                            }
                        }
                    }
                })

        if not self.es_client_sync.indices.exists(index=TgIndex.CONFIG_INDEX_NAME):
            self.es_client_sync.indices.create(index=TgIndex.CONFIG_INDEX_NAME)
        self.sync_config()

    def sync_config(self):
        resp = self.es_client_sync.search(
            index=TgIndex.CONFIG_INDEX_NAME,
            query={"match_all": {}},
            size=1000
        )
        self.sites = list(map(lambda x: {'id': x['_id'], 'name': x['_source']['name'], 'file_name': x['_source']['file_name']}, resp['hits']['hits']))
        self.sites_map = dict(map(lambda x: (x['id'], x['file_name']), self.sites))
        logging.info("Update sites list: %d sites" % len(self.sites))

    def index_background(self, filename):
        if self.thread is None or not self.thread.is_alive():
            self.thread = Thread(target=self._index_zip, args=(filename, ), daemon=True)
            self.thread.start()
        else:
            logging.info("System is busy")
            raise SystemBusyException()

    def _index_zip(self, filename):
        logging.info("Processing file %s" % filename)
        full_path = "%s/%s" % (self.working_dir, filename)
        self.index_info[filename] = {'state': 'running', 'processed': 0}
        try:
            with zipfile.ZipFile(full_path, 'r') as archive:
                with archive.open("result.json") as content:
                    obj = json.load(content)
                    self.index_info[filename]['total'] = len(obj['messages'])
                    logging.info("Total %s messages" % len(obj['messages']))

            with zipfile.ZipFile(full_path, 'r') as archive:
                with archive.open("result.json") as content:
                    obj = json.load(content)
                    tg_id = obj['id']
                    tg_name = obj['name']

                    messages = obj['messages']
                    logging.info("Starting indexing %s: %d messages" % (tg_name, len(messages)))

                    for message in messages:
                        self.index_info[filename]['processed'] += 1
                        if message['type'] != 'message':
                            continue
                        assert message['from_id'] == "channel%s" % tg_id, message
                        texts = []
                        message_doc = {
                            'site_id': tg_id,
                            'type': message['type'],
                            'date': message['date'],
                        }
                        links = []
                        if 'text' in message:
                            if type(message['text']) == str:
                                texts.append(message['text'])
                            elif type(message['text']) == list:
                                for text in message['text']:
                                    if type(text) == str:
                                        texts.append(text)
                                    else:
                                        if 'text' in text:
                                            texts.append(text['text'])
                                        if 'href' in text:
                                            links.append(text['href'])
                            else:
                                raise Exception("Unsupported text block type: %s" % message['text'])

                        if 'media_type' in message:
                            message_doc['media_type'] = message['media_type']
                            if message['media_type'] in ['video_file', 'video_message', 'animation']:
                                message_doc['mime_type'] = message['mime_type']
                                message_doc['file'] = validate_file(archive, message['file'])
                                message_doc['thumbnail'] = validate_file(archive, message.get('thumbnail', None))
                                message_doc['duration_seconds'] = message.get('duration_seconds', None)
                                message_doc['width'] = message.get('width', None)
                                message_doc['height'] = message.get('height', None)
                            elif message['media_type'] in ['audio_file', 'voice_message']:
                                message_doc['mime_type'] = message['mime_type']
                                message_doc['file'] = validate_file(archive, message['file'])
                                texts.append(message.get('title', ''))
                                message_doc['duration_seconds'] = message.get('duration_seconds', None)
                            elif message['media_type'] == 'sticker':
                                if 'text' not in message_doc:
                                    message_doc['text'] = ''
                                message_doc['text'] += ' ' + message['sticker_emoji']
                                texts.append(message_doc['text'].strip())
                            else:
                                raise Exception("Media type not supported: %s" % message)

                        if 'photo' in message:
                            message_doc['photo'] = validate_file(archive, message['photo'])
                            assert 'width' not in message_doc
                            message_doc['width'] = message.get('width', None)
                            message_doc['height'] = message.get('height', None)


                        message_doc['text'] = "\n".join(list(map(lambda x: x.strip(), texts))).strip()
                        if len(links) > 0:
                            message_doc['links'] = links

                        msg_id = "%s_%s" % (tg_id, message['id'])
                        self.es_client_sync.index(index=TgIndex.DATA_INDEX_NAME, id=msg_id, document=message_doc)

                    logging.info("Indexing finished for %s" % (tg_name))
                    tg_config = {
                        'name': tg_name,
                        'file_name': filename
                    }
                    self.es_client_sync.index(index=TgIndex.CONFIG_INDEX_NAME, id=tg_id, document=tg_config)
                    self.index_info[filename]['state'] = 'finished'
                    self.sync_config()
        except:
            tb = traceback.format_exc()
            logging.error("Indexation failed", tb)
            self.index_info[filename]['error'] = tb
            self.index_info[filename]['state'] = 'failed'
