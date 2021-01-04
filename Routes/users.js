const express = require('express')
var router = express.Router()
var multer = require('multer')

var captcha = require('../Utilities/read_captcha')
var gallery = require('../Utilities/upload')
var controller = require('../Controller/users')
var obj = require('../Utilities/verify_email')

// Initiating multer to store data in disk
//********************************************************************************************//
var upload = multer({ storage: gallery });
//********************************************************************************************//

router.post('/upload_image', upload.single('image'), controller.upload_image_for_website)
router.post('/register', obj.verify, controller.register)
router.post('/login', controller.login)
router.get('/get_otp_for_password/:email', controller.send_otp_for_forgot_password)
router.post('/change_password', controller.change_password)
router.post('/get_user_by_uid', controller.get_user_by_uid)
router.get('/captchas', controller.get_captcha)
router.post('/create_wallet', controller.create_wallet)
router.post('/add_token_in_wallet', controller.add_token_in_wallet)
router.post('/update_user_data', controller.update_user_data)
router.post('/verify_otp', controller.verify_otp)
router.post('/send_otp_for_register', controller.send_otp_for_register)
router.post('/resend_otp', controller.resend_otp)
router.get('/get_details_of_users/:user_id', controller.get_user_by_user_id)

module.exports = router;