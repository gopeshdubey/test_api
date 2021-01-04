require("dotenv").config();
var abi = require("human-standard-token-abi");
// var abi = require("./abi.json");
const Web3 = require("web3");

var web3 = new Web3(
  new Web3.providers.HttpProvider(
    "https://kovan.infura.io/v3/9870fb668f5e4e43a7858618f9e2c946"
  )
);

const start_erc20 = async () => {
  // usdt address - 0xdAC17F958D2ee523a2206206994597C13D831ec7
  let tokenAddress = "0xa5608750562975B9d4548AB28deDA325b2991dDB";
  // Get ERC20 Token contract instance
  var token = await new web3.eth.Contract(abi, tokenAddress);
  // Get the token name
  var name = await token.methods.name().call();
  var symbol = await token.methods.symbol().call();
  var decimals = await token.methods.decimals().call();
  var total_supply = await token.methods.totalSupply().call();
  var balance = await token.methods
    .balanceOf("0x831cF969009085a5Cd5e3646ABE437f78d9f9af4")
    .call();
  console.log({
    name,
    symbol,
    decimals: decimals.toString(),
    total_supply: total_supply.toString(),
    balance: balance.toString(),
  });
};

const create_account_of_eth = async () => {
  var data = await web3.eth.accounts.create();
  return data
}

module.exports = {create_account_of_eth}
