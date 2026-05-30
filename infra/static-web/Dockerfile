FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 8081
RUN sed -i 's/listen       80/listen       8081/' /etc/nginx/conf.d/default.conf
