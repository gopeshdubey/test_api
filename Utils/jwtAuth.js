const jwt = require('jsonwebtoken')

var obj = {};

obj.generateJWT = async (id, uid, first_name, last_name, email, wallet_address, walllet_pk_address) => {
  return jwt.sign(
    {
      id: id,
      uid: uid,
      first_name: first_name,
      last_name: last_name,
      email: email,
      wallet_address: wallet_address,
      walllet_pk_address: walllet_pk_address
    },
    "qwertyuioplkjhgfdsa",
    {
      expiresIn: 2700
    }
  );
};

module.exports = obj;
