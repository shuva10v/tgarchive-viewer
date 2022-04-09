#!/usr/bin/env python

import logging
import sys
import glob
import os
from tgindex import TgIndex

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s %(levelname)s %(message)s')
logging.getLogger('urllib3').setLevel(logging.INFO)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: %s [source_dir or zip file] [elasticsearch_url]" % sys.argv[0])
        sys.exit(-1)

    source = sys.argv[1]
    elasticsearch_url = sys.argv[2]
    try:
        index = TgIndex(elasticsearch_url)
    except:
        raise

    if os.path.isdir(source):
        logging.info("Looking for zip archives in %s" % source)
        files = glob.glob("%s/*zip" % source)
        logging.info("Got %s archives" % len(files))
        # TODO check if file already indexed
        for file in files:
            index.index_zip(file)
    else:
        index.index_zip(source)