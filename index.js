/* jslint es6 */
"use strict"
const pkg = require("./package.json")
const { send } = require("micro")
const url = require("url")
const Web3 = require("web3")
const { logger } = require("./logger")

const {
  parseEthBlocks,
  parseReceipts,
  parseTransactionReceipts,
  decodeReceipt,
  decodeBlock,
  prepareBlockTimestampsObject,
  setReceiptsTimestamp
} = require("./helper")

const { Exporter } = require("san-exporter")
const metrics = require("san-exporter/metrics")

const exporter = new Exporter(pkg.name)

const DRY_RUN = parseInt(process.env.DRY_RUN || "1")
const BLOCK_INTERVAL = parseInt(process.env.BLOCK_INTERVAL || "50")
const CONFIRMATIONS = parseInt(process.env.CONFIRMATIONS || "3")
let lastProcessedBlock = parseInt(process.env.START_BLOCK || "0")
const GET_RECEIPTS_ENDPOINT = process.env.GET_RECEIPTS_ENDPOINT
const TRANSACTION = parseInt(process.env.TRANSACTION || "0")

const NODE_URL = process.env.NODE_URL || "http://localhost:8545/"
logger.info(`Connecting to parity node ${NODE_URL}`)

const web3 = new Web3(new Web3.providers.HttpProvider(NODE_URL))
const jayson = require("jayson/promise")
const parityClient = jayson.client.https(NODE_URL)

const fetchEthReceipts = (fromBlock, toBlock) => {
  const batch = []
  for (fromBlock; fromBlock < toBlock + 1; fromBlock++) {
    batch.push(
      parityClient.request(
        GET_RECEIPTS_ENDPOINT,
        [web3.utils.numberToHex(fromBlock)],
        undefined,
        false
      )
    )
  }
  return parityClient.request(batch).then((responses) => parseReceipts(responses))
}

const fetchReceiptsFromTransaction = (fromBlock, toBlock, blocks) => {
  var batch = []
  for (let block = 0; block < blocks.length; block++) {
    var transactions = blocks[block]['transactions']
    if (transactions.length == 0) continue
    for (let trx = 0; trx < transactions.length; trx++) {
      var transactionHash = transactions[trx]['hash']
      batch.push(
        parityClient.request(
          GET_RECEIPTS_ENDPOINT,
          [transactionHash],
          undefined,
          false
        )
      )
    }
  }
  return (!batch.length) ? [] : parityClient.request(batch).then((responses) => parseTransactionReceipts(responses))
}

const fetchEthBlockTimestamps = (fromBlock, toBlock) => {
  const batch = []
  for (fromBlock; fromBlock < toBlock + 1; fromBlock++) {
    batch.push(
      parityClient.request(
        "eth_getBlockByNumber",
        [web3.utils.numberToHex(fromBlock),
        true],
        undefined,
        false
      )
    )
  }
  return parityClient.request(batch).then((responses) => parseEthBlocks(responses))
}

async function getReceiptsForBlocks(fromBlock, toBlock) {
  logger.info(`Fetching blocks ${fromBlock}:${toBlock}`)
  const blocks = await fetchEthBlockTimestamps(fromBlock, toBlock)
  var receipts

  if(!TRANSACTION) {
    receipts = await fetchEthReceipts(fromBlock, toBlock)
  }
  else {
    receipts = await fetchReceiptsFromTransaction(fromBlock, toBlock, blocks)
  }

  const decodedReceipts = receipts.map(decodeReceipt)
  const decodedBlocks = blocks.map(decodeBlock)

  const timestamps = prepareBlockTimestampsObject(decodedBlocks)

  return setReceiptsTimestamp(decodedReceipts, timestamps)
}

async function work() {
  const currentBlock = await web3.eth.getBlockNumber() - CONFIRMATIONS
  metrics.currentBlock.set(currentBlock)
  logger.info(`Fetching blocks for interval ${lastProcessedBlock}:${currentBlock}`)

  while (lastProcessedBlock < currentBlock) {
    const toBlock = Math.min(lastProcessedBlock + BLOCK_INTERVAL, currentBlock)
    metrics.requestsCounter.inc()

    const requestStartTime = new Date()

    const receipts = await getReceiptsForBlocks(lastProcessedBlock + 1, toBlock)

    metrics.requestsResponseTime.observe(new Date() - requestStartTime)

    if (receipts.length > 0) {
      logger.info(`Storing ${receipts.length} messages for blocks ${lastProcessedBlock + 1}:${toBlock}`)
      if (DRY_RUN !== 1) {
        await exporter.sendDataWithKey(receipts, "transactionHash")
      }
    }

    lastProcessedBlock = toBlock
    metrics.lastExportedBlock.set(lastProcessedBlock)
    if (DRY_RUN !== 1) {
      await exporter.savePosition(lastProcessedBlock)
    }
  }
}

const fetchReceipts = () => {
  work()
    .then(() => {
      logger.info(`Progressed to block ${lastProcessedBlock}`)

      // Look for new events every 30 sec
      setTimeout(fetchReceipts, 30 * 1000)
    }).catch((e) => {
      logger.error(`Error fetching receipts: ${e}`)
      process.exit(1)
    })
}

async function fetchLastImportedBlock() {
  const lastPosition = parseInt(await exporter.getLastPosition())

  if (lastPosition) {
    lastProcessedBlock = lastPosition
    logger.info(`Resuming export from position ${JSON.stringify(lastPosition)}`)
  } else {
    if (DRY_RUN !== 1) {
      await exporter.savePosition(lastProcessedBlock)
    }
    logger.info(`Initialized exporter with initial position ${JSON.stringify(lastProcessedBlock)}`)
  }
}

const init = async () => {
  await exporter.connect()
  await fetchLastImportedBlock()
  metrics.startCollection()
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
      resolve()
    } else {
      reject("Kafka client is not connected to any brokers")
    }
  })
}

module.exports = async (request, response) => {
  const req = url.parse(request.url, true)

  switch (req.pathname) {
    case "/healthcheck":
      return healthcheckKafka()
        .then(healthcheckParity())
        .then(() => send(response, 200, "ok"))
        .catch((err) => send(response, 500, `Connection to kafka or parity failed: ${err}`))
    case "/metrics":
      response.setHeader("Content-Type", metrics.register.contentType)
      return send(response, 200, metrics.register.metrics())
    default:
      return send(response, 404, "Not found")
  }
}
