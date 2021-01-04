const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { db2 } = require('../../DB/db')

var vote = new Schema({
  logo_url: {
    type: String,
    default: null
  },
  symbol: {
    type: String,
    default: null
  },
  email: {
    type: String,
    default: null
  },
  name: {
    type: String,
    default: null
  },
  contract_address: {
    type: String,
    default: null
  },
  website_link: {
    type: String,
    default: null
  },
  current_price: {
    type: Number,
    default: 0,
  },
  total_coins_in_number: {
    type: Number,
    default: 0,
  },
  voting_round_data: [
    {
      voting_round: {
        type: Number,
        default: 0,
      },
      total_votes: {
        type: Number,
        default: 0,
      },
    },
  ],
  current_round_votes: {
    type: Number,
    default: 0,
  },
  total_votes: {
    type: Number,
    default: 0,
  },
  air_drop: {
    type: Number,
    default: 0,
  },
  won_badges: {
    type: Number,
    default: 0,
  },
  status_from_admin: {
    type: String,
    default: "disabled", // disabled or active or listed
  },
  vote_data: [
    {
      user_id: {
        type: Object,
        default: null,
      },
      total_casted_votes: {
        type: Number,
        default: 0,
      }
    },
  ],
});

module.exports = db2.model("vote", vote);
