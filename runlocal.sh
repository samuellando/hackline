#!/bin/sh

npm run build
sudo docker build -f Dockerfile_local . -t [PROJECT_ID]
sudo docker run -p 8080:8080 [PROJECT_ID]
