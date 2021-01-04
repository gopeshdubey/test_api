const path = require("path");
const users = require("../Query/users");
const encryption = require("../Utils/jwtAuth");
const response = require("../Response/response");
var encrypt = require("../Utilities/encrypt");
var captcha = require("../captcha/captcha");

var object_data = {};

object_data.register = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;
    var hashed_password = await encrypt.hashPassword(password);
    const register_data = await users.register(
      first_name,
      last_name,
      email,
      hashed_password
    );
    response(res, 200, true, "Success", register_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    var login_data = await users.login(email, password);
    const token = await encryption.generateJWT(
      login_data[0]._id,
      login_data[0].uid,
      login_data[0].first_name,
      login_data[0].last_name,
      login_data[0].email,
      login_data[0].wallet_address,
      login_data[0].walllet_pk_address
    );
    res.header("x-auth-token", token).status(200).json({
      code: 200,
      success: true,
      message: "Login succesfully",
      result: token,
    });
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.send_otp_for_forgot_password = async (req, res) => {
  try {
    const { email } = req.params;
    var user_data = await users.send_mail_for_forgot_password(email)
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.change_password = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    var hashed_password = await encrypt.hashPassword(password);
    var user_data = await users.change_password(email, otp, hashed_password)
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.get_user_by_uid = async (req, res) => {
  try {
    const { uid } = req.body;
    var user_data = await users.get_user_by_uid(uid);
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.get_captcha = async (req, res) => {
  try {
    var captcha_data = await captcha.create_captcha();
    response(res, 200, true, "Success", captcha_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.create_wallet = async (req, res) => {
  try {
    const { user_id, symbol } = req.body;
    var create_wallet = await users.create_wallet(user_id, symbol);
    response(res, 200, true, "Success", create_wallet);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.add_token_in_wallet = async (req, res) => {
  try {
    const { user_id, symbol, type } = req.body;
    var res_data = await users.add_token_in_wallet(user_id, symbol, type)
    response(res, 200, true, "Success", res_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.update_user_data = async (req, res) => {
  try {
    const { user_id, first_name, last_name } = req.body;
    var user_data = await users.update_user_data(
      user_id,
      first_name,
      last_name
    );
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.upload_image_for_website = async (req, res) => {
  try {
    const file = req.file;
    console.log("file :::::", file);
    if (!file) {
      var image = null;
      response(res, 400, false, "Error", "Empty field");
    } else {
      var ext = path.extname(file.originalname);
      if (ext == ".png" || ext == ".jpg" || ext == ".jpeg") {
        let value = file.path;
        var image = "http://localhost:4040/" + value.substring(8, value.length);
        response(res, 200, true, "Success", image);
      } else {
        response(res, 400, false, "Error", "Give correct extension");
      }
    }
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.verify_otp = async(req, res) => {
  try {
    const { email, otp } = req.body
    var user_data = await users.verify_otp(email, otp)
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.send_otp_for_register = async (req, res) => {
  try {
    const { email } = req.body;
    var user_data = await users.send_otp_for_register(email)
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.resend_otp = async (req, res) => {
  try {
    const { email } = req.body;
    var user_data = await users.resend_otp(email)
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.get_user_by_user_id = async (req, res) => {
  try {
    const { user_id } = req.params;
    var user_data = await users.get_users_data(user_id)
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

module.exports = object_data;
