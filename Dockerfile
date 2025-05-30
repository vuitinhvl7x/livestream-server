FROM tiangolo/nginx-rtmp:latest

# Remove default Nginx configurations to avoid conflicts
RUN rm -f /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf || true

# Copy your custom Nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf
# Ensure the configuration file has the correct permissions
RUN chmod 644 /etc/nginx/nginx.conf

# Create the full directory path for VOD recordings.
# Nginx, with 'record_path /var/rec/live;', expects this full path (/var/rec/live)
# to exist and be writable. It typically does not create the 'live' subdirectory itself.
# Ensure the nginx user (from the base image) owns this directory.
RUN mkdir -p /var/rec/live && \
    mkdir -p /var/rec/hls && \
    mkdir -p /var/rec/dash && \
    chown -R www-data:www-data /var/rec/live && \
    chown -R www-data:www-data /var/rec/hls && \
    chown -R www-data:www-data /var/rec/dash

# Cài đặt ffmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Expose ports
EXPOSE 1935
EXPOSE 8080