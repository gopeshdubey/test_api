const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { db1 } = require("../DB/db");

// COINS WHICH ARE LISTED FOR EXCHANGE

var coin = new Schema({
  logo_url: {
    type: String,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  contract_address: {
    type: String,
    required: true,
  },
  token_id: {
    type: String,
    default: null,
  },
  website_link: {
    type: String,
    required: true,
  },
  token_type: {
    type: String,
    required: true,
  }, //ERC20 or TRC20 or TRC10
  total_coins_in_number: {
    type: Number,
    default: 0,
  },
  status_of_coin: {
    type: String,
    default: "disabled",
  }, // disabled, active
  last_price: [
    {
      user_data: [
        {
          user_id: {
            type: Object,
            default: null,
          },
          amount: {
            type: Number,
            default: null,
          },
        },
      ],
      price: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        default: 0,
      },
      pair_with: {
        type: String,
        default: null,
      },
      side: {
        type: String,
        default: null,
      }, //SELL OR BUY
      change_in_percentage: {
        type: Number,
        default: 0,
      },
    },
  ],
});

module.exports = db1.model("coin", coin);
