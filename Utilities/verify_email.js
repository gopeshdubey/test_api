const response = require('../Response/response')
const send_mail = require("../Utils/send_mail");
const Otp = require('../Model/otp')

var obj = {};

obj.verify = async(req, res, next) => {
    const { email, otp } = req.body;
    var otp_data = await Otp.find({email})
    if(otp == null || otp == undefined || otp == '' || otp != otp_data[0].otp) response(res, 400, false, "Please check otp")
    else next()
}

module.exports = obj;

