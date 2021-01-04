require("dotenv").config();
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");

let transporter = nodemailer.createTransport({

  host: "smtp.transmail.co.in",
  secure: true,
  port: 465,
  auth: {
    user: "emailappsmtp.df8a7418c",
    pass: "cGjGUItubAum__2df0eac479d76",
  },
});

send_mail = (to, text, code) => {
  var mailOptions = {
    from: "listing@arowex.com",
    to: to,
    subject: "Support from Arowex",
    html:
      "<div style='text-align:center; color: white; background: black; padding: 30px'><img src='https://arowex.com/size1.png' style='height: 60px; width: 140px'></img><p></p><img src='https://ci4.googleusercontent.com/proxy/ECjLxJVTXZoMv7HTOLf7wensTg8vCJLS4DrJtfYj32wJldQbjuvPV4KHGk5xRtwQ0c38R-RjTR4WcfVMT_ZAgmnoKXhlKaCkHwpHciBEVsDn--8=s0-d-e1-ft#https://d13dtqinv406lk.cloudfront.net/registrationMailer/otp.png'></img><h4 style='color: white'>" + text + " OTP is here -</h4><p style='color: white'><b>" + code + "</b></p></div>",
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        reject(error);
      } else {
        resolve("Email sent: " + info.response);
      }
    });
  });
};

module.exports = send_mail;
