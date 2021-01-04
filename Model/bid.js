const mongoose = require("mongoose");
const Schema = mongoose.Schema; 
const { db1 } = require('../DB/db')

// KEEP TRACK OF EACH USERS BIDS ON PARTICULAR COIN

var bids = new Schema({
  user_id: {
    type: Object,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  from_coin: {
    type: String,
    required: true,
  }, // jvz
  to_coin: {
    type: String,
    required: true,
  }, // usdt
  operation: {
    type: String,
    required: true,
  }, // BUY OR SELL
});

module.exports = db1.model("bids", bids);
