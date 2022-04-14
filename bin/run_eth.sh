 #! /bin/sh
export DRY_RUN=0
export NODE_URL=http://erigon-hz.stage.san:30250
export GET_RECEIPTS_ENDPOINT=eth_getBlockReceipts
export START_BLOCK=14440390
docker-compose -f ./docker/docker-compose.yml up --build
