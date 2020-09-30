# ETH Receipts Exporter

A small service that exports all ETH receipts from the ethereum blockchain to a Kafka topic.
It is written in javascript and uses ![web3.js](https://github.com/ethereum/web3.js/) library which implements the Ethereum JSON RPC spec.


## Run

You need to have access to a parity full node. By default in docker-compose `PARITY_URL` points to
the staging instance.

```bash
$ ./bin/run.sh
```

The service requires exactly parity, as GETH does not implement the API used in it.
