FROM tiangolo/nginx-rtmp

# Remove default Nginx configurations to avoid conflicts
RUN rm -f /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf || true

# Copy your custom Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf
# Ensure the configuration file has the correct permissions
RUN chmod 644 /etc/nginx/nginx.conf

# Create the base directory that will be used as a mount point for recordings.
# Nginx, with 'record_path /var/rec/live;', will create the 'live' subdirectory
# within this mount point if it has write permissions.
RUN mkdir -p /var/rec