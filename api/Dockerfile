# Set the base image to Ubuntu
FROM    node

# File Author / Maintainer
MAINTAINER Michael Martins Kuhinica

# Provides cached layer for node_modules
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /src && cp -a /tmp/node_modules /src/

# Define working directory
WORKDIR /src
ADD . /src

# Expose port
EXPOSE  8080

CMD ["node", "src/index.js"]
