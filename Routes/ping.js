const express = require('express')
var router = express.Router()

const controller = require('../Controller/ping')

router.get('/ping', controller.ping)

module.exports = router