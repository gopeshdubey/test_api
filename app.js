var express = require("express");
var app = express();
var http = require("http");
var bodyParser = require("body-parser");
var Webhook = require("coinbase-commerce-node").Webhook;
var cors = require("cors");
var socket = require("socket.io");
const path = require("path");
var fs = require("fs");
const votes = require("./Query/vote");
const usdt = require("./USDT/usdt");
var send_mail = require("./Utils/send_mail");
require("./DB/db");
require("./Cron/cron_job");
var { get_balance_of_trc20, transfer_trc20 } = require("./Utils/trc20");
var erc20 = require("./Utils/erc20");

const web3 = require("./Web3/web3");
const crydata = require("./Utils/util");
const ping = require("./Routes/ping");
const users = require("./Routes/users");
const coin = require("./Routes/coin");
const coins = require("./Routes/coins");
const vote = require("./Routes/vote");

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("uploads"));
app.use(express.static(path.join(__dirname, "html")));

app.use("/api/v3", ping);
app.use("/api/v3/users", users);
app.use("/api/v3/simple", coin);
app.use("/api/v3/coins", coins);
app.use("/api/v3/vote", vote);
// app.use('/api/v3/exchanges')

usdt()
  .then(async (tronWeb) => {
    // var accounts = await tronWeb.createAccount()
    // console.log({accounts});
    const address = "TYzwR4Dhc64mggN8tGBSJhab9cyDbHJpJC";
    tronWeb.trx
      .getBalance(address)
      .then((balance) => {
        console.log({ balance });
      })
      .catch((err) => console.error("Error in balance"));
  })
  .catch((error) => {
    console.log("error :::::", error);
  });

web3
  .create_accounts()
  .then((data) => {
    // console.log("PK :::::", data);
    web3
      .get_address(data.privateKey)
      .then((data) => {
        web3
          .get_balance(data.address)
          .then((data) => console.log("Balance :::::", data))
          .catch((err) => console.log("Error :::::", err));
      })
      .catch((err) => console.log("Error :::::", err));
  })
  .catch((err) => {
    console.log("error :::::", err);
  });

crydata.encrypt_data("hi").then(async (data) => {
  console.log('-------------------------------');
  crydata.decrypt_data(data).then(async (data) => {
    console.log("encrypted data :::::", data);
  });
});

http.createServer(app).listen(80);
console.log("Server running at 80");

