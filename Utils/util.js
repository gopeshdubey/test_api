require("dotenv").config();
var CryptoJS = require("crypto-js");

encrypt_data = async (data) => {
  var s = await CryptoJS.AES.encrypt(
    JSON.stringify(data),
    process.env.PK
  ).toString();

  // REMOVE LAST
  var remove_last = s.slice(0, -1);

  // PERFORM OPERATION
  var returned_obj = await operation(remove_last);

  return returned_obj;
};

decrypt_data = async (data) => {
  // CONVERT DATA
  var returned_obj = await operation(data);

  var res = await CryptoJS.AES.decrypt(returned_obj, process.env.PK).toString(
    CryptoJS.enc.Utf8
  );
  return res;
};

const operation = async (string) => {
  // DIVIDE IN HALF
  var middle = await Math.floor(string.length / 2);
  var res = await string.slice(0, middle);

  // LENGTH OF FIRST HALF
  var length = await Math.floor(res.length);

  // GET SECOND HALF
  var resp = await string.slice(length, string.length);

  // REVERSE FIRST HALF
  var reversed = await res.split("").reverse().join("");

  // REVERSE SECOND HALF
  var reverseds = await resp.split("").reverse().join("");

  // JOIN REVERSED
  var final_string = reverseds + reversed;

  return final_string;
};

module.exports = {
  encrypt_data,
  decrypt_data,
};
