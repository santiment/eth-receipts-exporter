#! /bin/sh

docker build --build-arg NODE_ENV=development -t eth-receipts-exporter-test -f docker/Dockerfile . &&
docker run --rm -t eth-receipts-exporter-test npm test