FROM nginx

# Install Node.js
RUN \
  apt-get update && \
  apt-get install -y curl build-essential && \
  apt-get install -y git && \
  curl -sL https://deb.nodesource.com/setup_0.12 | bash - && \
  apt-get install -y nodejs && \
  apt-get purge -y curl apt-transport-https && \
  apt-get autoremove -y && \
  apt-get clean all

RUN npm cache clean
RUN npm install -g npm@latest
RUN npm install -g bower gulp

# Provides cached layer for node_modules
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /src && cp -a /tmp/node_modules /src/

# Cache for bower
ADD bower.json /tmp/bower.json
ADD .bowerrc /tmp/.bowerrc
RUN cd /tmp && bower install
RUN cp -a /tmp/bower_components /src/

WORKDIR /src
ADD . /src

RUN gulp --API_ADDR=104.197.79.52 --API_PORT=8080
RUN cp -ra /src/dist/* /usr/share/nginx/html
