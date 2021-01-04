const response = require("../Response/response");

const ping = (req, res) => {
  response(res, 200, true, "Success", "Welcome to Arowex");
};

module.exports = { ping };
