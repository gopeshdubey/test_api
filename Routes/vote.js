const express = require('express')
var router = express.Router()

var controller = require('../Controller/vote')

router.post('/create_listing', controller.create_listing)
router.post('/cast_vote', controller.cast_vote)
router.get('/increase_energy/:user_id/:count', controller.increase_vote_energy)
// sort_item = "trending", "top_list", "newly_added", "already_listed"
router.get('/sorted_listing_coin/:sort_item', controller.sorted_listing_coin)
router.get('/start_voting', controller.start_voting)
router.get('/get_energy_time/:user_id', controller.get_user_energy_timer)
router.get('/get_all_listing_coins', controller.get_all_listing_coins)
router.put('/update_listing_coin_status/:coin_id/:status', controller.update_status_of_listing_coins)

module.exports = router;