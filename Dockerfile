FROM node:14.17.6 as base
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install
RUN npm i --save-dev @types/pg

COPY ./src /usr/src/app/src/
COPY .env ./
COPY ./entrypoint.sh /usr/src/app/
ADD ./entrypoint.sh /usr/src/app/
RUN ["chmod", "+x", "/usr/src/app/entrypoint.sh"]
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]