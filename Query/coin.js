var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;

const Wallet = require("../Model/wallet");
const Coins = require("../Model/coin");

var object_data = {};

object_data.deposit_coins = (user_id, coin, amount) => {
  return new Promise(async (resolve, reject) => {
    try {
      var filtered_data = await get_account_by_user_id_coin(user_id, coin);
      var price = filtered_data[0].deposits + amount;
      var updated_data = await update_deposits_of_coin(user_id, coin, price);
      resolve(updated_data);
    } catch (error) {
      reject(error);
    }
  });
};

object_data.sell_coin = (user_id, coin, amount) => {
  return new Promise(async (resolve, reject) => {
    try {
      var filtered_data = await get_account_by_user_id_coin(user_id, coin);
      var balance = filtered_data[0].balance;
      if (balance >= amount) {
        var price = filtered_data[0].amount_for_sell + amount;
        var updated_data = await update_sell_of_coin(user_id, coin, price);
        resolve(updated_data);
      } else {
        reject("Not enough funds");
      }
    } catch (error) {
      reject(error);
    }
  });
};

object_data.buy_coin = async (user_id, coin, amount) => {
  return new Promise(async (resolve, reject) => {
    try {
      var filtered_data = await get_account_by_user_id_coin(user_id, coin);
      var balance = filtered_data[0].balance;
      var price = filtered_data[0].amount_for_sell - amount;
      var updated_data = await update_sell_of_coin(user_id, coin, price);
      var get_coin = await get_coin_details(coin);
      console.log("get_coin_details :::::", get_coin);
      if (condition) {
        
      } else {
        
      }
    } catch (error) {
      reject(error);
    }
  });
};

// ----------------------------- FUNCTIONS --------------------------------------------

const get_account_by_user_id_coin = (user_id, coin) => {
  return new Promise((resolve, reject) => {
    var usersProjection = {
      __v: false,
      _id: false,
      user_id: false,
      wallet_pk: false,
    };
    Wallet.find(
      { user_id: ObjectId(user_id), "crypto_details.sign": coin },
      usersProjection,
      async (err, success) => {
        if (err) reject(err);
        else {
          var filtered_data = await success[0].crypto_details.filter((data) => {
            return data.sign == coin;
          });
          resolve(filtered_data);
        }
      }
    );
  });
};

const update_deposits_of_coin = (user_id, coin, price) => {
  return new Promise((resolve, reject) => {
    Wallet.updateOne(
      { user_id: ObjectId(user_id), "crypto_details.sign": coin },
      {
        $set: {
          "crypto_details.$.deposits": price,
        },
      },
      (err, success) => {
        if (err) reject(err);
        else resolve(success);
      }
    );
  });
};

const update_sell_of_coin = (user_id, coin, price) => {
  return new Promise((resolve, reject) => {
    Wallet.updateOne(
      { user_id: ObjectId(user_id), "crypto_details.sign": coin },
      {
        $set: {
          "crypto_details.$.amount_for_sell": price,
        },
      },
      (err, success) => {
        if (err) reject(err);
        else resolve(success);
      }
    );
  });
};

const get_coin_details = (coin) => {
  return new Promise((resolve, reject) => {
    Coins.find({ symbol: coin }, async (err, success) => {
      if (err) reject(err);
      else {
        resolve(success);
      }
    });
  });
};

const update_bid_and_current_price_jvz = (user_id, coin, bid_amount) => {
  return new Promise((resolve, reject) => {
    Coins.updateOne(
      { symbol: coin },
      {
        $push: {
          "bid.user_id": user_id,
          "bid.bid_amount": bid_amount,
          current_price: bid_amount,
        },
      },
      (err, success) => {
        if (err) reject(err);
        else resolve(success);
      }
    );
  });
};

const create_bid_and_current_price = (
  user_id,
  coin,
  bid_amount,
  coin_amount
) => {
  return new Promise((resolve, reject) => {
    const coins = new Coins({ 
      symbol: coin,
      bid: {
        user_id: ObjectId(user_id),
        bid_amount: bid_amount,
      },
      coin_amount: coin_amount,
      current_price: bid_amount,
    });
    coins.save((err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

module.exports = object_data;
