FROM python:3.9

COPY requirements.txt /opt/api/
RUN pip3 install -r /opt/api/requirements.txt

COPY tgviewer.py /opt/api/
COPY tg_build_index.py /opt/api/

EXPOSE 8000
CMD cd /opt/api/ && uvicorn tgviewer:app --port 8000 --host 0.0.0.0