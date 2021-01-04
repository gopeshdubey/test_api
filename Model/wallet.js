const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { db1 } = require("../DB/db");

var walletSchema = new Schema({
  user_id: {
    type: Object,
    required: true,
  },
  crypto_details: [
    {
      symbol: {
        type: String,
        default: null,
      }, // BTC, ETH, TRON
      address: {
        type: String,
        default: null,
      },
      pk: {
        type: String,
        default: null,
      },
      coin_data: [
        {
          coin_symbol: {
            type: String,
            default: null,
          },
          type: {
            type: String,
            default: null
          }, // BTC, ETH, TRX
          balance: {
            type: Number,
            default: 0,
          },
          deposits: {
            type: Number,
            default: 0,
          },
          withdrawles: {
            type: Number,
            default: 0,
          },
          amount_for_sell: {
            type: Number,
            default: 0,
          },
        },
      ],
      balance: {
        type: Number,
        default: 0,
      },
      deposits: {
        type: Number,
        default: 0,
      },
      withdrawles: {
        type: Number,
        default: 0,
      },
      amount_for_sell: {
        type: Number,
        default: 0,
      },
    },
  ],
});

module.exports = db1.model("wallet", walletSchema);
