 #! /bin/sh
export DRY_RUN=1
export NODE_URL=http://polygon-rpc.stage.san:32080
export GET_RECEIPTS_ENDPOINT=eth_getTransactionReceiptsByBlock
export START_BLOCK=0
docker-compose -f ./docker/docker-compose.yml up --build
