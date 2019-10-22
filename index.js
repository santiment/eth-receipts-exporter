/* jslint es6 */
"use strict";
const pkg = require('./package.json');
const array = require('lodash/array');
const collection = require('lodash/collection');
const { send } = require('micro')
const url = require('url')
const Web3 = require('web3')
const { Exporter } = require('@santiment-network/san-exporter')

const exporter = new Exporter(pkg.name)

const BLOCK_INTERVAL = parseInt(process.env.BLOCK_INTERVAL || "100")
const CONFIRMATIONS = parseInt(process.env.CONFIRMATIONS || "3")
let lastProcessedBlock = parseInt(process.env.START_BLOCK || "0")

const PARITY_URL = process.env.PARITY_URL || "http://localhost:8545/";
console.info(`Connecting to parity node ${PARITY_URL}`)
const web3 = new Web3(new Web3.providers.HttpProvider(PARITY_URL))
const jayson = require('jayson/promise');
const parityClient = jayson.client.http(PARITY_URL);

const fetchEthReceipts = (fromBlock, toBlock) => {
  var batch = [];
  for (fromBlock; fromBlock < toBlock + 1; fromBlock++) {
    batch.push(parityClient.request('parity_getBlockReceipts', [web3.utils.numberToHex(fromBlock)], undefined, false))
  }
  return parityClient.request(batch).then((responses) => responses.map((response) => response["result"]))
}

function decodeLog(log) {
  collection.forEach(["blockNumber", "logIndex", "transactionIndex", "transactionLogIndex"],
    key => log[key] = web3.utils.hexToNumber(log[key])
  )

  return log
}

function decodeReceipt(receipt) {
  collection.forEach(["blockNumber", "status", "transactionIndex"],
    key => receipt[key] = web3.utils.hexToNumber(receipt[key])
  )

  collection.forEach(["cumulativeGasUsed", "gasUsed"],
    key => receipt[key] = web3.utils.hexToNumberString(receipt[key])
  )

  receipt["logs"] = receipt["logs"].map(decodeLog)

  return receipt
}

async function getReceiptsForBlocks(fromBlock, toBlock) {
  console.info(`Fetching blocks ${fromBlock}:${toBlock}`)
  const blocks = await fetchEthReceipts(fromBlock, toBlock)

  return array.compact(array.flatten(blocks)).map(decodeReceipt)
}

async function work() {
  const currentBlock = await web3.eth.getBlockNumber() - CONFIRMATIONS
  console.info(`Fetching blocks for interval ${lastProcessedBlock}:${currentBlock}`)

  while (lastProcessedBlock < currentBlock) {
    const toBlock = Math.min(lastProcessedBlock + BLOCK_INTERVAL, currentBlock)
    const receipts = await getReceiptsForBlocks(lastProcessedBlock + 1, toBlock)

    if (receipts.length > 0) {
      console.info(`Storing ${receipts.length} messages for blocks ${lastProcessedBlock + 1}:${toBlock}`)
      await exporter.sendDataWithKey(receipts, "transactionHash")
    }

    lastProcessedBlock = toBlock
    await exporter.savePosition(lastProcessedBlock)
  }
}

const fetchReceipts = () => {
  work()
    .then(() => {
      console.log(`Progressed to block ${lastProcessedBlock}`)

      // Look for new events every 30 sec
      setTimeout(fetchReceipts, 30 * 1000)
    }).catch((e) => {
      console.log(`Error fetching receipts: ${e}`)
      process.exit(1)
    })
}

async function fetchLastImportedBlock() {
  const lastPosition = await exporter.getLastPosition()

  if (lastPosition) {
    lastProcessedBlock = lastPosition
    console.info(`Resuming export from position ${JSON.stringify(lastPosition)}`)
  } else {
    await exporter.savePosition(lastProcessedBlock)
    console.info(`Initialized exporter with initial position ${JSON.stringify(lastProcessedBlock)}`)
  }
}

const init = async () => {
  await exporter.connect()
  await fetchLastImportedBlock()
  await fetchReceipts()
}

init()

//======================================================
const healthcheckParity = () => {
  return web3.eth.getBlockNumber()
}

const healthcheckKafka = () => {
  return new Promise((resolve, reject) => {
    if (exporter.producer.isConnected()) {
      resolve();
    } else {
      reject("Kafka client is not connected to any brokers");
    }
  });
};

module.exports = async (request, response) => {
  const req = url.parse(request.url, true);
  const q = req.query;

  switch (req.pathname) {
    case '/healthcheck':
      return healthcheckKafka()
        .then(healthcheckParity())
        .then(() => send(response, 200, "ok"))
        .catch((err) => send(response, 500, `Connection to kafka or parity failed: ${err}`))

    default:
      return send(response, 404, 'Not found');
  }
}
