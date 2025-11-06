FROM prom/prometheus:latest

WORKDIR /etc/prometheus

COPY prometheus.yml prometheus.yml

CMD ["--config.file=/etc/prometheus/prometheus.yml"]