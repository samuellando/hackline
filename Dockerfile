# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM node:20

COPY . ./

RUN npm install

ENV PORT=8080

CMD exec node -r "dotenv/config" build
