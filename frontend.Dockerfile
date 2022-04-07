FROM nginx:1.21.6

COPY build/ /usr/share/frontend
COPY nginx.conf /etc/nginx/conf.d/default.conf