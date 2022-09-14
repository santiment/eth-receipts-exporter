 #! /bin/sh
export DRY_RUN=0
export NODE_URL=http://optimism-hz.stage.san:32080
export GET_RECEIPTS_ENDPOINT=eth_getTransactionReceipt
export START_BLOCK=0
export KAFKA_TOPIC=opt_receipts
export TRANSACTION=1
docker-compose -f ./docker/docker-compose.yml up --build
