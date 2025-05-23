
FROM tiangolo/nginx-rtmp 

RUN rm -f /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf || true

COPY nginx.conf /etc/nginx/nginx.conf
RUN chmod 644 /etc/nginx/nginx.conf # Đảm bảo quyền đọc