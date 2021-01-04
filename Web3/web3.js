require("dotenv").config();
const Web3 = require("web3");

var web3_obj = {};

var web3 = new Web3(
  new Web3.providers.HttpProvider(
    "https://kovan.infura.io/v3/9870fb668f5e4e43a7858618f9e2c946"
  )
);

web3_obj.create_accounts = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      var data = await web3.eth.accounts.create();
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

// GET MULTIPLE ACCOUNTS
web3_obj.get_accounts = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      var data = await web3.eth.getAccounts();
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

// GET ADDRESS FROM PK
web3_obj.get_address = async (key) => {
  return new Promise(async (resolve, reject) => {
    try {
      var data = await web3.eth.accounts.privateKeyToAccount(key);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

// GET BALANCE FROM ADDRESS
web3_obj.get_balance = async (address) => {
  return new Promise(async (resolve, reject) => {
    try {
      var data = await web3.eth.getBalance(address);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = web3_obj;
