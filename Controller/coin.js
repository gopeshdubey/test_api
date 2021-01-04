const bids = require('../Query/coin')
const response = require('../Response/response')

var object_data = {}

object_data.deposit_coin = async (req, res) => {
    try {
        const { amount } = req.body;
        const { user_id, coin } = req.params;
        const response_data = await bids.deposit_coins(user_id, coin, amount)
        response(res, 200, true, "Success", response_data)
    } catch (error) {
        response(res, 400, false, "Error", error)
    }
}

object_data.buy_coin = async (req, res) => {
    try {
        const { amount } = req.body;
        const { user_id, coin } = req.params;
        const response_data = await bids.buy_coin(user_id, coin, amount)
        response(res, 200, true, "Success", response_data)
    } catch (error) {
        response(res, 400, false, "Error", error)
    }
}

module.exports = object_data;