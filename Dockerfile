FROM mhart/alpine-node:6.9.2
# Frickin' npm - https://github.com/npm/npm/issues/16807
RUN cd $(npm root -g)/npm && npm install fs-extra && sed -i -e s/graceful-fs/fs-extra/ -e s/fs.rename/fs.move/ ./lib/utils/rename.js
RUN npm i -g npm@5.3.0
ENV TERM=xterm-256color
COPY package.json package-lock.json /opt/sftp-server/
WORKDIR /opt/sftp-server
RUN npm i
COPY . /opt/sftp-server
ENTRYPOINT node ./example/server.js
