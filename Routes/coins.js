const express = require('express')
var router = express.Router()

const controller = require('../Controller/coins')

const check_pair = require('../Utils/pairs').check_pair

router.post('/create_coin', controller.create_coin)
router.post('/buy', controller.buy)
router.post('/sell', controller.sell)
router.post('/sell_coin', controller.sell_coin_by_symbol)
router.post('/buy_coin', controller.buy_coin)
router.get('/search_coin/:symbol/:pair_with', controller.search_coin)
router.get('/get_all_coins_price', controller.get_all_coin_price)
router.get('/get_coin_price/:symbol', controller.get_price_of_coin)
router.get('/get_all_coin_for_sell', controller.get_all_coin_for_sell)
router.get('/get_all_coin_for_buy', controller.get_all_coin_for_buy)
router.post('/get_coin_balance_of_users', check_pair, controller.get_coin_balance_of_users)
router.get('/get_all_pairs_for_coin', controller.get_all_pairs_for_coin)
router.post('/get_balance', controller.get_balance)

module.exports = router;