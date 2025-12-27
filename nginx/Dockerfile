FROM nginx:latest

RUN apt-get update && apt-get install -y \
    wget \
    libnss3-tools \
    && rm -rf /var/lib/apt/lists/*
    
COPY nginx.conf /etc/nginx/nginx.conf
COPY certs/ /etc/nginx/certs/

CMD ["nginx", "-g", "daemon off;"]