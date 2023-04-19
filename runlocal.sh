#!/bin/sh

npm run build
sudo docker build -f Dockerfile_local . -t timelogger-slando
sudo docker run -p 8080:8080 timelogger-slando
