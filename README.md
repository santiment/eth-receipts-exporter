# ETH Receipts Exporter

A small service that exports all ETH receipts from the ethereum blockchain to a Kafka topic. It is written in javascript and uses ![web3.js](https://github.com/ethereum/web3.js/) library which implements the Ethereum JSON RPC spec.

## Running the service

The easiest way to run the service is using `docker-compose`:

Example:

```bash
$ docker-compose up --build
```

You need to tweak the URL to the parity service in the `docker-compose.yml`. The service requires exactly parity, as GETH does not implement the API used in it.
