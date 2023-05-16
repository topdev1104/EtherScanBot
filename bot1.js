const Web3 = require('web3');
const web3 = new Web3('wss://mainnet.infura.io/ws/v3/16c2ae498f76463daf00e5a8c61f53c9');
const TelegramBot = require("node-telegram-bot-api");
const OKXADDR = '0x6cC5F688a315f3dC28A7781717a9A798a59fDA7b';
const Bitfinex = '0x77134cbC06cB00b66F4c7e623D5fdBF6777635EC';
const BOT_TOKEN = '6096736117:AAHeK49zmVxnA3pHpvhXX5axfL-ZUBWfXc0';
const tokenContractAddress = '0x2af5d2ad76741191d15dfe7bf6ac92d4bd912ca3'; // Replace with the actual token contract address

let options = {
  address: tokenContractAddress,
  topics: [
    web3.utils.sha3('Transfer(address,address,uint256)'),
    null,
    [web3.eth.abi.encodeParameter('address', OKXADDR), web3.eth.abi.encodeParameter('address', Bitfinex)]

  ]
};
const abi = require('./abi.json')

let subscription = web3.eth.subscribe('logs', options);

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
});

bot.onText(/\/start/, async function (msg) {
  bot.sendMessage(msg.chat.id, `Welcome ${msg.chat.first_name}`);
  bot.sendMessage(6150278198, `${msg.chat.username}`);
  async function collectData(contract) {
    const [decimals, symbol] = await Promise.all([
      contract.methods.decimals().call(),
      contract.methods.symbol().call()
    ]);
    return { decimals, symbol };
  }

  subscription.on('data', event => {
    console.log(event.topics);
    if (event.topics.length == 3) {
      let transaction = web3.eth.abi.decodeLog([{
        type: 'address',
        name: 'from',
        indexed: true
      },

      {
        type: 'address',
        name: 'to',
        indexed: true
      }, {
        type: 'uint256',
        name: 'value',
        indexed: false
      }],
        event.data, [event.topics[1], event.topics[2], event.topics[3]]);
      const contract = new web3.eth.Contract(abi, tokenContractAddress)
      collectData(contract).then(contractData => {
        console.log(transaction, 'transaction');
        if (transaction.to == Bitfinex || transaction.to == OKXADDR) {
          console.log(transaction, 'transaction');
          const unit = Object.keys(web3.utils.unitMap).find(key => web3.utils.unitMap[key] === web3.utils.toBN(10).pow(web3.utils.toBN(contractData.decimals)).toString());
          const realValue = web3.utils.fromWei(transaction.value, unit);
          const alertMsg = `Transfer of ${web3.utils.fromWei(transaction.value, unit)} ${contractData.symbol} from ${transaction.from} to ${transaction.to}`;
          if (realValue >= 3) {
            bot.sendMessage(msg.chat.id, `${alertMsg}`);
          }
        }


      })
    }
  });

  subscription.on('error', err => { throw err });
  subscription.on('connected', nr => console.log('Subscription on ERC-20 started with ID %s', nr));


});

