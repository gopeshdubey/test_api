const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { db2 } = require('../../DB/db')

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
      default: null,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    wallet_address: {
      type: String,
      default: null,
    },
    walllet_pk_address: {
      type: String,
      default: null,
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
      default: 0
    },
    energy_limit: {
      type: Number,
      default: 4
    },
    energy_boost_level: {
      type: Number,
      default: 1
    },
    otp: {
      type: Number,
      default: 0
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
          type: Number,
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
        total_balance_of_coin: {
          type: Number,
          default: null,
        },
        available_balance_of_coin: {
          type: Number,
          default: null,
        },
        in_order: {
          type: Number,
          default: null,
        },
      },
    ],
    withdraw_data: [
      {
        coin_id: {
          type: Object,
          default: null,
        },
        amount: {
          type: Number,
          default: null,
        },
        time: {
          type: Number,
          default: null,
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
          type: Number,
          default: null,
        },
        pair_from: {
          type: String,
          default: null,
        }, // ask to sir
        pair_to: {
          type: String,
          default: null,
        },
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
          default: null,
        },
        amount: {
          type: Number,
          default: null,
        },
        filled: {
          type: String,
          default: null,
        },
        total: {
          type: Number,
          default: null,
        },
        status: {
          type: String,
          default: null,
        }, // pending or completed
      },
    ],
  },
]);

module.exports = db2.model('register', registerSchema);

// module.exports = mongoose.model("register", registerSchema);
