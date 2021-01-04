const fetch = require("node-fetch");

var object_data = {};

object_data.get_all_coins_details = () => {
  return new Promise((resolve, reject) => {
    fetch("https://blockchain.info/ticker")
      .then((res) => res.json())
      .then((data) => resolve(data))
      .catch((err) => reject(err));
  });
};

// CONVERT USD TO BITCOIN
object_data.convert_usd_to_btc = async (value) => {
  return new Promise((resolve, reject) => {
    fetch("https://blockchain.info/tobtc?currency=USD&value=" + value)
      .then((res) => res.json())
      .then((response) => resolve(response))
      .catch((err) => reject(err));
  });
};

module.exports = object_data;
