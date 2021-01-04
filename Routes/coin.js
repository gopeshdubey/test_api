const express = require('express')
var router = express.Router()

const controller = require('../Controller/coin.js')

// router.get('/get_all_bids/:symbol', controller.get_all_bids) // get all bids on particular coin
// router.get('/get_ticker_of_all_coins', controller.get_ticker_of_all_coin)
// router.get('/get_ticker_of_coin', controller.get_ticker_of_coin)
// router.get('/get_orders/:user_id', controller.get_orders)

// router.delete('/delete_all_orders/:user_id', controller.delete_order)
// router.delete('/delete_order_by_id/:user_id/:order_id', controller.delete_order_by_id)

// router.get('/get_balance/:user_id', controller.get_balance)
// router.get('/get_balance_of_coin/:user_id/:coin', controller.get_balance_of_coin)
router.post('/deposit_coin/:user_id/:coin', controller.deposit_coin)
// router.get('/get_all_deposits/:user_id', controller.get_all_deposits)
// router.get('/get_deposits_by_id/:user_id/:deposit_id', controller.get_deposit_by_id)
// -----------------------------------------------------------------------------------------------------
// router.post('/sell_coin', controller.sell_coin)
router.post('/buy_coin/:user_id/:coin', controller.buy_coin)
// router.post('/withdrawles/:user_id', controller.withdraw) // get users id , coin name and amount
// router.get('/get_all_withdrawles/:user_id', controller.get_all_withdrawles)
// router.get('/get_withdrawles_by_id/:user_id/:withdrawle_id', controller.get_withdrawle_by_id)

module.exports = router

