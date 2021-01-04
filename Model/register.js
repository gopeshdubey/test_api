const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { db1 } = require("../DB/db");

var registerSchema = new Schema([
  {
    uid: {
      type: String,
      required: true,
    },
    is_admin: {
      type: Boolean,
      default: false,
    },
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    vote_energy: {
      type: Number,
      default: 4,
    },
    check_for_day_completion: {
      type: Number,
      default: null,
    },
    check_for_hour_completion: {
      type: Number,
      default: null,
    },
    voting_deadline: {
      type: Number,
      default: null,
    },
    voting_round: {
      type: Number,
      default: 0,
    },
    energy_limit: {
      type: Number,
      default: 4,
    },
    energy_boost_level: {
      type: Number,
      default: 1,
    },
    otp: {
      type: Number,
      default: 0,
    },
    deposit_data: [
      {
        coin_id: {
          type: Object,
          default: null,
        },
        status: {
          type: String,
          default: null,
        },
        amount: {
          type: Number,
          default: null,
        },
        time: {
          type: String,
          default: null,
        },
        address: {
          type: String,
          default: null,
        },
        trx_id: {
          type: String,
          default: null,
        },
      },
    ],
    balance_data: [
      {
        coin_id: {
          type: Object,
          default: null,
        },
        symbol: {
          type: String,
          default: 0,
        },
        total_balance_of_coin: {
          type: Number,
          default: 0,
        },
        available_balance_of_coin: {
          type: Number,
          default: 0,
        },
        in_order: {
          type: Number,
          default: 0,
        },
      },
    ],
    withdraw_data: [
      {
        coin_id: {
          type: Object,
          default: null,
        },
        symbol: {
          type: String,
          default: null,
        },
        amount: {
          type: Number,
          default: 0,
        },
        time: {
          type: Number,
          default: 0,
        },
        address_to: {
          type: String,
          default: null,
        },
        address_from: {
          type: String,
          default: null,
        },
        trx_id: {
          type: String,
          default: null,
        }, // unique
      },
    ],
    open_orders_data: [
      {
        date: {
          type: String,
          default: 0,
        },
        user_order_id: {
          type: Object,
          default: null
        }, // ID OF USER DATA WHO BIDDED
        pair_from: {
          type: String,
          default: null,
        },
        pair_to: {
          type: String,
          default: null,
        },
        user_data_who_filling_the_bid: [
          {
            bidder_id: {
              type: Object,
              default: null,
            }, // USER ID OF USER FROM WHICH THE BID WILL MATCH, BID WILL BE OPPOSITE OF WHAT THE CURRENT BIDDER PLACED THE BID FOR EX. ( A. USER BID FOR SELL SO SECOND USER WILL BE BUY ONE AND VICE VERSA )
            amount: {
              type: Number,
              default: 0,
            },
          },
        ],
        type: {
          type: String,
          default: null,
        },
        side: {
          type: String,
          default: null,
        }, //SELL OR BUY
        price: {
          type: Number,
          default: 0,
        },
        amount: {
          type: Number,
          default: 0,
        },
        filled: {
          type: Number,
          default: 0,
        },
        total: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          default: null,
        }, // pending or confirmed
      },
    ],
  },
]);

module.exports = db1.model("register", registerSchema);

// module.exports = mongoose.model("register", registerSchema);
