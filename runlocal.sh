#!/bin/sh

npm run build
sudo docker build . -t timelogger-slando
sudo docker run -p 8080:8080 timelogger-slando
