#!/bin/sh
set -e

# Copy template to writable location
cp /etc/alertmanager/alertmanager.yml.template /etc/alertmanager/alertmanager.yml

# Replace ${SENDGRID_API_KEY} placeholder with actual environment variable
# Alertmanager doesn't support env var substitution
if [ -n "$SENDGRID_API_KEY" ]; then
    sed -i "s|\${SENDGRID_API_KEY}|${SENDGRID_API_KEY}|g" /etc/alertmanager/alertmanager.yml
    sed -i "s|\${SENDGRID_EMAIL_FROM}|${SENDGRID_EMAIL_FROM}|g" /etc/alertmanager/alertmanager.yml
fi

# Start Alertmanager
exec /bin/alertmanager \
    --config.file=/etc/alertmanager/alertmanager.yml \
    --storage.path=/alertmanager \
    "$@"