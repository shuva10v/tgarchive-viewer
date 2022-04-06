#!/usr/bin/env python

import logging
import sys
import zipfile
import glob
import json
from elasticsearch import Elasticsearch

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')
logging.getLogger('urllib3').setLevel(logging.INFO)

CONFIG_INDEX_NAME = "tg_archive_config"
DATA_INDEX_NAME = "tg_archive_data"

def validate_file(zip, filename):
    try:
        zip.getinfo(filename)
    except KeyError:
        logging.error("File name %s is missing" % (filename))
        return "broken"
    return filename

def index_zip(filename, es_client):
    logging.info("Processing file %s" % filename)
    with zipfile.ZipFile(filename, 'r') as archive:
        with archive.open("result.json") as content:
            obj = json.load(content)
            tg_id = obj['id']
            tg_name = obj['name']

            messages = obj['messages']
            logging.info("Starting indexing %s: %d messages" % (tg_name, len(messages)))

            for message in messages:
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
                        message_doc['width'] = message['width']
                        message_doc['height'] = message['height']
                    elif message['media_type'] in ['audio_file', 'voice_message']:
                        message_doc['mime_type'] = message['mime_type']
                        message_doc['file'] = validate_file(archive, message['file'])
                        texts.append(message.get('title', ''))
                        message_doc['duration_seconds'] = message['duration_seconds']
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
                    message_doc['width'] = message['width']
                    message_doc['height'] = message['height']


                message_doc['text'] = "\n".join(list(map(lambda x: x.strip(), texts))).strip()
                if len(links) > 0:
                    message_doc['links'] = links

                msg_id = "%s_%s" % (tg_id, message['id'])
                es_client.index(index=DATA_INDEX_NAME, id=msg_id, document=message_doc)

            logging.info("Indexing finished for %s" % (tg_name))
            tg_config = {
                'name': tg_name,
                'file_name': filename
            }
            es_client.index(index=CONFIG_INDEX_NAME, id=tg_id, document=tg_config)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: %s [source_dir] [elasticsearch_url]" % sys.argv[0])
        sys.exit(-1)

    source_dir = sys.argv[1]
    elasticsearch_url = sys.argv[2]
    es_client = Elasticsearch(elasticsearch_url)
    if es_client.indices.exists(index=CONFIG_INDEX_NAME):
        logging.info("Config index %s already exists" % CONFIG_INDEX_NAME)
        resp = es_client.search(index=CONFIG_INDEX_NAME, query={"match_all": {}})
        logging.info("Already indexed %s archives" % resp['hits']['total']['value'] )
    else:
        logging.info("Config index %s is missing" % CONFIG_INDEX_NAME)

    if not es_client.indices.exists(index=DATA_INDEX_NAME):
        es_client.indices.create(
            index=DATA_INDEX_NAME,
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


    logging.info("Looking for zip archives in %s" % source_dir)
    files = glob.glob("%s/*zip" % source_dir)
    logging.info("Got %s archives" % len(files))
    # TODO check if file already indexed
    for file in files:
        index_zip(file, es_client)