const response = require("../Response/response");

const Pairs = ['TRON', 'ETH', 'USDT', 'BTC', 'GO']

const check_pair = (req, res, next) => {
    const { pair_with } = req.body;
    if (Pairs.includes(pair_with.toUpperCase())) next()
    else response(res, 400, false, "Error", "Pair doesn't exist");
} 

module.exports = { Pairs, check_pair }