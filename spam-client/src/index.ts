#!/usr/bin/env node
import fs from 'fs'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import near from 'near-api-js';
const Near = require('near-api-js');

/**
 * Connection to the network
 */
let client: near.Near


const networkConfig: any = {
  networkId: 'localnet',
  nodeUrl: 'http://127.0.0.1:3030',
  walletUrl: `https://wallet.${process.env.NEAR_NETWORK}.near.org`,
  helperUrl: `https://helper.${process.env.NEAR_NETWORK}.near.org`,
  explorerUrl: `https://explorer.${process.env.NEAR_NETWORK}.near.org`,
  keyStore: {}
}

/**
 * Establish a connection to the cluster
 */
export async function establishConnection(port = 3030): Promise<void> {
  client = await Near.connect({ ...networkConfig, nodeUrl: `http://127.0.0.1:${port}` });

  const provider = client.connection.provider;
  // console.log('Client config: ', client.config);

  const status = await provider.status();
  // console.log('Status: ', status);
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true)
    }, ms)
  })
}

// Formatter helper for Near amounts.
function formatAmount(amount) {
  return BigInt(Near.utils.format.parseNearAmount(amount.toString()));
}

const txAmount = formatAmount(1);

function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

interface accountsOptions {
  number: number
}

yargs(hideBin(process.argv))
  .command(
    'accounts',
    'generate accounts --number [number]',
    () => { },
    async (argv: accountsOptions) => {
      await establishConnection()
      console.log('Creating Accounts!!!')
      let accounts = []
      let accountsWithFund = []
      let keyPair
      let public_key
      let account_id
      let accountInfo
      for (let i = 90000; i < argv.number + 90000; i++) {
        keyPair = Near.KeyPair.fromRandom('ed25519');
        public_key = keyPair.getPublicKey().toString();
        account_id = `account${i}`
        accountInfo = {
          account_id,
          public_key,
          secret_key: keyPair.secretKey
        }
        accounts.push(accountInfo)
        accountsWithFund.push(
          {
            "Account": {
              "account_id": account_id,
              "account": {
                "amount": "1000000000000000000000000000000000",
                "locked": "0",
                "code_hash": "11111111111111111111111111111111",
                "storage_usage": 0,
                "version": "V1"
              }
            }
          })
        accountsWithFund.push(
          {
            "AccessKey": {
              "account_id": account_id,
              "public_key": public_key,
              "access_key": {
                "nonce": 0,
                "permission": "FullAccess"
              }
            }
          })
      }
      try {
        fs.writeFileSync('publicAddresses.json', JSON.stringify(accountsWithFund, null, 2))
        fs.writeFileSync('accounts.json', JSON.stringify(accounts, null, 2))
        console.log(
          `Wrote ${accounts.length} account${accounts.length > 1 ? 's' : ''
          } to accounts.json`
        )
      } catch (error) {
        console.log(`Couldn't write accounts to file: ${error.message}`)
      }
    }
  )
  .option('type', {
    alias: 'number',
    type: 'number',
    description: 'number of accounts',
  }).argv


interface spamOptions {
  duration: number
  rate: number
  start: number
  end: number
  port: number
}

yargs(hideBin(process.argv))
  .command(
    'spam',
    'spam nodes for [duration] seconds at [rate] tps',
    () => { },
    async (argv: spamOptions) => {
      await establishConnection(argv.port)
      spam(argv)
    }
  )
  .option('duration', {
    alias: 'd',
    type: 'number',
    description: 'The duration (in seconds) to spam the network',
  })
  .option('start', {
    alias: 's',
    type: 'number',
    description: 'The starting index on accounts to use when spamming',
  })
  .option('end', {
    alias: 'e',
    type: 'number',
    description: 'The ending index on accounts to use when spamming',
  })
  .option('port', {
    alias: 'p',
    type: 'number',
    description: 'The RPC port number to use',
  })
  .option('rate', {
    alias: 'r',
    type: 'number',
    description: 'The rate (in tps) to spam the network at',
  }).argv


const spam = async (argv: spamOptions) => {
  let tps = argv.rate
  let duration = argv.duration
  let txCount = tps * duration
  let accounts
  try {
    accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf8'))
    console.log(
      `Loaded ${accounts.length} account${accounts.length > 1 ? 's' : ''
      } from accounts.json`
    )
  } catch (error) {
    console.log(`Couldn't load accounts from file: ${error.message}`)
    return
  }
  let start = argv.start ? argv.start : 0
  let end = argv.end ? argv.end : accounts.length
  console.log(start, end)
  // Shuffling the accounts array not to run into issue when another client is also spamming at the same time
  // shuffle(accounts)
  // const filteredAccount = accounts.slice(0, txCount)
  const keyStore = new Near.keyStores.InMemoryKeyStore();
  const lastAccountIndex = start + txCount < end ? start + txCount : end
  for (let i = start; i < lastAccountIndex; i++) {
    const keyPair = Near.KeyPair.fromString(accounts[i].secret_key);
    keyStore.setKey("localnet", accounts[i].account_id, keyPair);
  }
  client = await Near.connect({
    ...networkConfig,
    keyStore,
  });
  const provider = client.connection.provider;
  // let sendAccounts = []
  // let randomAccounts = []
  // let k = start;
  // for (let i = 0; i < txCount; i++) {
  //   const account: any = await client.account(accounts[k].account_id);
  //   sendAccounts.push(account)
  //   const randomAccount = accounts[getRandomArbitrary(start, end)].account_id
  //   randomAccounts.push((randomAccount))
  //   k++
  // }

  const waitTime = (1 / tps) * 1000
  let currentTime
  let sleepTime
  let elapsed
  let lastTime = Date.now()
  let LatestBlockBeforeSpamming = await provider.status()
  console.log('LatestBlockBeforeSpamming', LatestBlockBeforeSpamming.sync_info.latest_block_height)
  let spamStartTime = Math.floor(Date.now() / 1000)
  let k = start;
  for (let i = 0; i < txCount; i++) {

    const account: any = await client.account(accounts[k].account_id);
    const randomAccount = accounts[getRandomArbitrary(start, end)].account_id
    account.sendMoney(randomAccount, txAmount);

    // sendAccounts[i].sendMoney(randomAccount[i], txAmount);

    // const result = await account.sendMoney(randomAccount, txAmount);
    // console.log(result)
    currentTime = Date.now()
    elapsed = currentTime - lastTime
    sleepTime = waitTime - elapsed
    if (sleepTime < 0) sleepTime = 0
    await sleep(sleepTime)
    lastTime = Date.now()
    k++
  }
  let spamEndTime = Math.floor(Date.now() / 1000)
  var timeDiff = spamEndTime - spamStartTime; //in ms
  // strip the ms
  // timeDiff /= 1000;
  // get seconds 
  var seconds = Math.round(timeDiff);

  let LatestBlockAfterSpamming = await provider.status()
  console.log('LatestBlockAfterSpamming', LatestBlockAfterSpamming.sync_info.latest_block_height)
  console.log('totalSpammingTime', seconds)

}

interface blockOptions {
  output: string
  startblock: number
}

yargs(hideBin(process.argv))
  .command(
    'check_tps',
    'get tps --output file.json',
    () => { },
    async (argv: blockOptions) => {
      await establishConnection()
      getTPS(argv)
    }
  )
  .option('startblock', {
    alias: 's',
    type: 'number',
    description: 'The block number before spamming',
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'To save the blocks info into a json file',
  }).argv

const getTPS = async (argv: blockOptions) => {
  let startblock = argv.startblock
  let output = argv.output
  let startTime
  let endTime
  let endblock
  let totalTransactions = 0
  let blockInfo: any
  const provider = client.connection.provider;
  // Fetch node status.
  const status = await provider.status();
  // console.log('network status:', status);
  let block_number = status.sync_info.latest_block_height
  let chunkDetails
  while (true) {
    try {
      blockInfo = await provider.block({ blockId: block_number });
    } catch (e) {
      break
    }
    chunkDetails = await provider.chunk(blockInfo.chunks[0].chunk_hash)
    if (blockInfo.chunks.length > 1) {
      console.log(block_number, 'has chunks siz of', blockInfo.chunks.length)
    }
    if (block_number === startblock) {
      startTime = blockInfo.header.timestamp
      fs.appendFile(output, JSON.stringify(blockInfo, null, 0), function (err) {
        if (err) throw err;
      });
      break
    }
    if (chunkDetails.transactions.length) {
      // console.log(block_number, chunkDetails.transactions.length)
      blockInfo.transactionsSize = chunkDetails.transactions.length
      totalTransactions += chunkDetails.transactions.length
      if (!endblock) {
        endblock = block_number
        endTime = blockInfo.header.timestamp
      }
      fs.appendFile(output, JSON.stringify(blockInfo, null, 0), function (err) {
        if (err) throw err;
      });
    }
    // console.log('block by height:', block_number, blockInfo.chunks.length, chunkDetails.transactions.length);
    block_number--
  }
  let averageTime = (endTime - startTime) / 1000000000;
  console.log('startBlock', startblock, 'endBlock', endblock)
  console.log(`total time`, averageTime)
  console.log(`total txs: `, totalTransactions)
  console.log(`avg tps`, totalTransactions / averageTime)
}
