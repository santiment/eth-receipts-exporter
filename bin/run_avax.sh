 #! /bin/sh
export DRY_RUN=0
export NODE_URL=http://avalanche-hz.stage.san:32080/ext/bc/C/rpc
export GET_RECEIPTS_ENDPOINT=eth_getTransactionReceipt
export START_BLOCK=0
export KAFKA_TOPIC=avax_receipts
export AVAX=1
docker-compose -f ./docker/docker-compose.yml up --build
