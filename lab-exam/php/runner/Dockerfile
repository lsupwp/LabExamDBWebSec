FROM php:8.2-apache

RUN docker-php-ext-install mysqli pdo pdo_mysql \
  && a2enmod rewrite headers vhost_alias \
  && printf '%s\n' \
       '; labexam runner — no outbound HTTP from student code' \
       'allow_url_fopen = Off' \
       'allow_url_include = Off' \
       'disable_functions = curl_exec,curl_multi_exec,passthru,shell_exec,system,proc_open,popen,pcntl_exec' \
       '; submissions overwrite files every grade — never cache bytecode' \
       'opcache.enable = 0' \
       'opcache.enable_cli = 0' \
     > /usr/local/etc/php/conf.d/zz-labexam-lockdown.ini

COPY vhost.conf /etc/apache2/sites-available/000-default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && mkdir -p /var/www/data/submissions /var/www/uploads_secure \
  && chown -R www-data:www-data /var/www/data /var/www/uploads_secure

WORKDIR /var/www/data
ENTRYPOINT ["/entrypoint.sh"]
