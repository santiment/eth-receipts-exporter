 #! /bin/sh
export DRY_RUN=1
export NODE_URL=http://parity.stage.san:30954
export GET_RECEIPTS_ENDPOINT=parity_getBlockReceipts
export START_BLOCK=1000000
docker-compose -f ./docker/docker-compose.yml up --build
