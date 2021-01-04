const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { db1 } = require('../DB/db')

var vote = new Schema({
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
  website_link: {
    type: String,
    required: true,
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

module.exports = db1.model("vote", vote);
