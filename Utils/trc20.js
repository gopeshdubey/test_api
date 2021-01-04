var TronWeb = require("tronweb");
const BigNumber = require("bignumber.js");
require("dotenv").config();

const mainNetProvider = "https://api.trongrid.io";
const testNetProvider = "https://api.shasta.trongrid.io";
// "https://api.shasta.trongrid.io";
const netProvider = testNetProvider;
const HttpProvider = TronWeb.providers.HttpProvider; // Optional provider, can just use a url for the nodes instead
const fullNode = new HttpProvider(`${netProvider}`); // Full node http endpoint
const solidityNode = new HttpProvider(`${netProvider}`); // Solidity node http endpoint
const eventServer = `${netProvider}`; // Contract events http endpoint
const privateKey = process.env.PRV_KEY;
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);

const args = {
  callValue: 0,
  shouldPollResponse: true,
};

const trc20_details = async (recipientAddress) => {
  const contractInstance = await tronWeb
    .contract()
    .at("TD7ZjKX292NRa15w3PzzGZ1yA9veqve684");
  const name = await contractInstance.name().call();
  console.log({ name });
  const symbol = await contractInstance.symbol().call();
  console.log({ symbol });
  const decimals = await contractInstance.decimals().call();
  console.log({ decimals });
  const totalSupply = await contractInstance.totalSupply().call();
  console.log({ totalSupply: totalSupply.toString() });
  const balanceOf = await contractInstance
    .balanceOf("TYzwR4Dhc64mggN8tGBSJhab9cyDbHJpJC")
    .call();
  console.log({ balanceOf: balanceOf.balance.toString() });

  let balanceOfrecipientAddress = await contractInstance
    .balanceOf(recipientAddress)
    .call();
  console.log({
    balanceOfrecipientAddress: balanceOfrecipientAddress.balance.toString(),
  });

  // SEND TRC20 TO ACCOUNT
  // const amount = 12 * Math.pow(10, decimals);
  // console.log({amount});
  // contractInstance["Transfer"]().watch((err, event) => {
  //   if (err) return console.error('Error with "method" event:', err);
  //   if (event) {
  //     // some function
  //     console.log({event});
  //   }
  // });
  // const transfer = await contractInstance
  //   .transfer(recipientAddress, amount)
  //   .send(args);
  // console.log({ transfer }); // { transfer: { success: true } }

  // balanceOfrecipientAddress = await contractInstance
  //   .balanceOf(recipientAddress)
  //   .call();
  // console.log({
  //   balanceOfrecipientAddress: balanceOfrecipientAddress.balance.toString(),
  // });
};

const get_balance_of_trc20 = async (contract_address, user_address) => {
  const contractInstance = await tronWeb.contract().at(contract_address);
  const decimals = await contractInstance.decimals().call();
  const balanceOf = await contractInstance.balanceOf(user_address).call();
  let x = parseFloat(balanceOf.balance);
  var y = x / 10 ** decimals;
  return y;
};

const transfer_trc20 = async (contract_address, from, to, amount) => {
  var contractInstance = await tronWeb.contract().at(contract_address);
  var balanceOf_from = await get_balance_of_trc20(contract_address, from),
    balanceOf_to = await get_balance_of_trc20(contract_address, to),
    my = await get_balance_of_trc20(
      contract_address,
      "TYzwR4Dhc64mggN8tGBSJhab9cyDbHJpJC"
    );

  console.log({
    from: balanceOf_from,
    to: balanceOf_to,
    my,
  });

  const decimals = await contractInstance.decimals().call();

  return new Promise(async (res, rej) => {
    try {
      var converted_amount = parseFloat(parseFloat(amount).toFixed(decimals));
      var new_amount = converted_amount * Math.pow(10, decimals);
      console.log({ new_amount });
      var transfer = await contractInstance.transfer(to, new_amount).send(args);

      console.log({ transfer });

      var balanceOf_from = await get_balance_of_trc20(contract_address, from),
        balanceOf_to = await get_balance_of_trc20(contract_address, to),
        my = await get_balance_of_trc20(
          contract_address,
          "TYzwR4Dhc64mggN8tGBSJhab9cyDbHJpJC"
        );
      console.log({
        from: balanceOf_from,
        to: balanceOf_to,
        my,
      });
      res(transfer);
    } catch (error) {
      rej(error);
    }
  });
};

const trc10_details = async () => {
  var toAddress = recipientAddress;
  var tokenID = "1000441";
  var amount = 1000;
  var fromAddress = "TYzwR4Dhc64mggN8tGBSJhab9cyDbHJpJC";
  //Creates an unsigned TRC10 token transfer transaction
  const tradeobj = await tronWeb.transactionBuilder
    .sendToken(toAddress, amount, tokenID, fromAddress)
    .then((output) => {
      console.log("- Output:", output, "\n");
      return output;
    });
  //sign
  const signedtxn = await tronWeb.trx.sign(tradeobj, privateKey);
  //broadcast
  const receipt = await tronWeb.trx
    .sendRawTransaction(signedtxn)
    .then((output) => {
      console.log("- Output:", output, "\n");
    });

  var address = "TM2TmqauSEiRf16CyFgzHV2BVxBejY9iyR";
  //Query the information of an account, and check the balance by assetV2 in the return value.
  const tradeobj1 = await tronWeb.trx.getAccount(fromAddress);
  console.log("- Output:", tradeobj1, "\n");
};

const create_account_of_tron = async () => {
  var accounts = await tronWeb.createAccount();
  return accounts;
};

module.exports = {
  create_account_of_tron,
  get_balance_of_trc20,
  transfer_trc20,
};
