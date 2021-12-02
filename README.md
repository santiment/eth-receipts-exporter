# ETH & Polygon Receipts Exporter

A small service that exports all ETH/Polygon receipts from the ethereum/polygon blockchain to a Kafka topic.
It is written in javascript and uses ![web3.js](https://github.com/ethereum/web3.js/) library which implements the Ethereum JSON RPC spec.


## Run Ethereum

You need to have access to a parity full node. By default in run_eth.sh `NODE_URL` points to
the staging instance.

```bash
$ ./bin/run_eth.sh
```

The service requires exactly parity, as GETH does not implement the API used in it.


## Run Polygon

You need to have access to a polygon(bor) full node. By default in run_polygon.sh `NODE_URL` points to
the staging instance.

```bash
$ ./bin/run_polygon.sh
```
