#!/bin/bash
set -e
mkdir -p /var/www/data/submissions /var/www/data/uploads_secure
ln -sfn /var/www/data/uploads_secure /var/www/uploads_secure
chown -R www-data:www-data /var/www/data /var/www/uploads_secure 2>/dev/null || true
exec apache2-foreground
