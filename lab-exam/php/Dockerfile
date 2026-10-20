FROM php:8.2-apache

RUN docker-php-ext-install mysqli pdo pdo_mysql \
  && a2enmod rewrite headers

COPY www/ /var/www/html/
RUN mkdir -p /var/www/uploads_secure \
  && chown -R www-data:www-data /var/www/html /var/www/uploads_secure

WORKDIR /var/www/html
