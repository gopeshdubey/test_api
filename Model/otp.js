const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { db1 } = require('../DB/db')

var otp = new Schema({
    email: {
        type: String,
        required: true
    },
    otp: {
        type: Number,
        default: 0
    }
})

module.exports = db1.model("otp", otp);
