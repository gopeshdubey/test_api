const captcha = require('../captcha/captcha');
const response = require('../Response/response')
const captcha_array = require('../captcha/captcha').captcha

const check_captcha = (data) => {
    if (!captcha_array.includes(data.toLowerCase())) {
        return true
    } else {
        return false
    }
}

module.exports = read_captcha = async (req, res, next) => {
    var captcha = req.body.captcha;
    if (captcha == undefined || captcha == null) {
        response(res, 400, false, "Please give correct captcha and in correct order", captcha)
    } else {
        if (captcha.length == 5) {
            var value = await captcha.map(data => check_captcha(data))
            if (value.includes(true)) {
                response(res, 400, false, "Please give correct captcha", captcha)
            } else {
                next()
            }
        } else {
            response(res, 400, false, "Please give correct captcha and in correct order", captcha)
        }
    }
}