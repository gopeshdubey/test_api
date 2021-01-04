const Register = require("../Model/register");
const Wallet = require("../Model/wallet");
const Otp = require("../Model/otp");
const send_mail = require("../Utils/send_mail");
const web3 = require("../Utils/erc20");
const tron = require("../Utils/trc20");
const cryp_data = require("../Utils/util");
var mongoose = require("mongoose");
var dateFormat = require("dateformat");
var ObjectId = mongoose.Types.ObjectId;

var encrypt = require("../Utilities/encrypt");

// GET ALL COLLECTION
// var models_data = await mongoose.connection.db.listCollections().toArray();

var ObjectData = {};

ObjectData.register = (first_name, last_name, email, password) => {
  return new Promise(async (resolve, reject) => {
    try {
      var uid = await getRandomString();
      var uid_data = await get_users_by_uid(uid);
      while (uid_data.length > 0) {
        uid = await getRandomString();
        uid_data = await get_users_by_uid(uid);
      }
      var user_data = await get_users_by_email(email);
      if (user_data.length > 0) {
        reject("Already a user");
      } else {
        await Otp.remove({ email });
        var register = new Register({
          uid: uid,
          first_name: first_name,
          last_name: last_name,
          email: email,
          password: password,
        });
        register.save((err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

ObjectData.send_otp_for_register = async (email) => {
  return new Promise(async (res, rej) => {
    try {
      var user_data = await get_users_by_email(email);
      if (user_data.length > 0) rej("Already a user");
      else {
        var random = Math.floor(100000 + Math.random() * 900000);
        var resp = await Otp.find({ email });
        if (resp.length > 0) {
          Otp.update(
            { email },
            {
              $set: {
                otp: random,
              },
            },
            (err, data) => {
              if (err) rej(err);
              else {
                // SEND MAIL
                send_mail(email, "Validation", random).then((respo) => {
                  console.log("mail response :::::", respo);
                });
                res(data);
              }
            }
          );
        } else {
          var otp_data = new Otp({
            email,
            otp: random,
          });
          otp_data.save((err, data) => {
            if (err) rej(err);
            else {
              // SEND MAIL
              send_mail(email, "Validation", random).then((resp) => {
                console.log("mail response :::::", resp);
              });
              res(data);
            }
          });
        }
      }
    } catch (error) {
      rej(error);
    }
  });
};

ObjectData.login = async (email, password) => {
  return new Promise((resolve, reject) => {
    Register.find({ email: email }, async (err, data) => {
      if (err) reject(err);
      else {
        if (data.length > 0) {
          rehash = await encrypt.decryptPassword(password, data[0].password);
          if (!rehash) {
            reject("Password incorrect");
          } else {
            try {
              await send_otp(email);
              resolve(data);
            } catch (error) {
              rej("Error in sending mail");
            }
          }
        } else {
          reject("Not registered");
        }
      }
    });
  });
};

const send_otp = (email) => {
  return new Promise((res, rej) => {
    var random = Math.floor(100000 + Math.random() * 900000);
    Register.update(
      { email },
      {
        $set: {
          otp: random,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else {
          if (data.nModified == 1) {
            // SEND MAIL
            send_mail(email, "Validation", random).then((res) => {
              console.log("mail response :::::", res);
            });
            res(data);
          } else rej("Something went wrong");
        }
      }
    );
  });
};

ObjectData.resend_otp = (email) => {
  return new Promise(async (res, rej) => {
    await send_otp(email);
    res("Success");
  });
};

ObjectData.verify_otp = (email, otp) => {
  return new Promise((res, rej) => {
    Register.find({ email, otp }, (err, data) => {
      if (err) rej(err);
      else if (data.length <= 0) rej("Wrong otp");
      else {
        Register.update(
          { email },
          {
            $set: {
              otp: 0,
            },
          },
          (err, data) => {
            if (err) rej("Something went wrong");
            else if (data.nModified > 0) res("Success");
            else rej("Something went wrong");
          }
        );
      }
    });
  });
};

ObjectData.send_mail_for_forgot_password = async (email) => {
  return new Promise(async (res, rej) => {
    var user_data = await get_users_by_email(email);
    if (user_data.length > 0) {
      await send_otp(email);
      res("Success");
    } else {
      rej("No such user exist");
    }
  });
};

ObjectData.change_password = async (email, otp, password) => {
  return new Promise(async (res, rej) => {
    try {
      var resp = await ObjectData.verify_otp(email, otp);
      if (resp != "Success") rej("Wrong otp");
      else {
        Register.updateOne(
          { email },
          {
            $set: {
              password,
            },
          },
          (err, data) => {
            if (err) rej(err);
            else if (data.nModified > 0) res("Success");
            else rej("Something went wrong");
          }
        );
      }
    } catch (error) {
      rej("Wrong otp");
    }
  });
};

ObjectData.get_user_by_uid = async (uid) => {
  return new Promise(async (resolve, reject) => {
    try {
      var uid_data = await get_users_by_uid(uid);
      resolve(uid_data);
    } catch (error) {
      reject(error);
    }
  });
};

ObjectData.create_wallet = async (user_id, symbol) => {
  return new Promise(async (resolve, reject) => {
    try {
      var wallet_data = await find_wallet_data_by_user_id(user_id);
      var find_wallet_data = await find_wallet_by_symbol(user_id, symbol);
      
      console.log({ find_wallet_data });
      switch (symbol.toUpperCase()) {
        case "BTC":
          var tron_acc = await tron.create_account_of_tron();
          var tron_pk = tron_acc.privateKey;
          var tron_addr = tron_acc.address.base58;
          var crypt_data = await cryp_data.encrypt_data(tron_pk);
          var crypto_details = {
            symbol: symbol.toUpperCase(),
            address: tron_addr,
            pk: crypt_data,
          };
          var wallet = new Wallet({
            user_id: ObjectId(user_id),
            crypto_details,
          });
          if (wallet_data.length > 0 && find_wallet_data.length == 0) {
            var data = await add_coin_in_wallet(user_id, crypto_details);
            resolve(data);
          } else {
            if (wallet_data.length == 0) {
              var data = await create_wallet(wallet);
              resolve(data);
            } else {
              reject("Already have a wallet");
            }
          }
          resolve(data);
          break;
        case "ETH":
          var eth_acc = await web3.create_account_of_eth();
          var eth_pk = eth_acc.privateKey;
          var eth_addr = eth_acc.address;
          var crypt_data = await cryp_data.encrypt_data(eth_pk);
          var crypto_details = {
            symbol: symbol.toUpperCase(),
            address: eth_addr,
            pk: crypt_data,
          };
          var wallet = new Wallet({
            user_id: ObjectId(user_id),
            crypto_details,
          });
          if (wallet_data.length > 0 && find_wallet_data.length == 0) {
            var data = await add_coin_in_wallet(user_id, crypto_details);
            resolve(data);
          } else {
            if (wallet_data.length == 0) {
              var data = await create_wallet(wallet);
              resolve(data);
            } else {
              reject("Already have a wallet");
            }
          }
          resolve(data);
          break;
        case "TRON":
          var tron_acc = await tron.create_account_of_tron();
          var tron_pk = tron_acc.privateKey;
          var tron_addr = tron_acc.address.base58;
          var crypt_data = await cryp_data.encrypt_data(tron_pk);

          var crypto_details = {
            symbol: symbol.toUpperCase(),
            address: tron_addr,
            pk: crypt_data,
          };
          var wallet = new Wallet({
            user_id: ObjectId(user_id),
            crypto_details,
          });
          if (wallet_data.length > 0 && find_wallet_data.length == 0) {
            var data = await add_coin_in_wallet(user_id, crypto_details);
            resolve(data);
          } else {
            if (wallet_data.length == 0) {
              var data = await create_wallet(wallet);
              resolve(data);
            } else {
              reject("Already have a wallet");
            }
          }
          break;
      }
    } catch (error) {
      reject(error);
    }
  });
};

const find_wallet_data_by_user_id = (user_id) => {
  return new Promise((res, rej) => {
    Wallet.find({ user_id: ObjectId(user_id) }, (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
};

const find_wallet_by_symbol = (user_id, symbol) => {
  return new Promise((res, rej) => {
    Wallet.aggregate(
      [
        { $unwind: "$crypto_details" },
        {
          $match: {
            $and: [
              { user_id: { $eq: ObjectId(user_id) } },
              { "crypto_details.symbol": { $eq: symbol.toUpperCase() } },
            ],
          },
        },
      ],
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const create_wallet = (wallet) => {
  return new Promise((res, rej) => {
    wallet.save((err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
};

const add_coin_in_wallet = (user_id, crypto_details) => {
  return new Promise((res, rej) => {
    Wallet.updateOne(
      { user_id: ObjectId(user_id) },
      {
        $push: {
          crypto_details,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else {
          if(data.nModified > 0) res(data)
          else rej('Error in update')
        }
      }
    );
  });
};

ObjectData.add_token_in_wallet = async (user_id, symbol, type) => {
  // first confirm coin is listed and active or not from coin model
  return new Promise(async (res, rej) => {
    try {
      var wallet_data = await find_wallet_by_symbol(user_id, type)
      if (wallet_data.length > 0) {
        var token_data = await find_token_in_wallet(user_id, symbol, type)
        console.log({token_data});
        if (token_data.length > 0) {
          rej("Already have a token in wallet")
        } else {
          var update_data = await insert_token(user_id, symbol, type)
          res(update_data)
        }
      } else {
        rej("No wallet exist")
      }
    } catch (error) {
      rej(error)
    }
  })
}

const insert_token = async (user_id, symbol, type) => {
  return new Promise((res, rej) => {
    Wallet.update(
      {user_id: ObjectId(user_id), "crypto_details.symbol": type.toUpperCase()},
      {
        $push: {
          "crypto_details.$.coin_data": {
            coin_symbol: symbol.toUpperCase(),
            type: type.toUpperCase()
          }
        }
      },
      (err, data) => {
        if(err) rej(err)
        else {
          if(data.nModified > 0) res(data)
          else rej('Error in update')
        }
      }
    )
  })
}

const find_token_in_wallet = async (user_id, symbol, type) => {
  return new Promise((res, rej) => {
    Wallet.aggregate(
      [
        { $unwind: "$crypto_details" },
        { $unwind: "$crypto_details.coin_data"},
        {
          $match: {
            $and: [
              { user_id: { $eq: ObjectId(user_id) } },
              { "crypto_details.symbol": { $eq: type.toUpperCase() } },
              { "crypto_details.coin_data.coin_symbol": { $eq: symbol.toUpperCase() } }
            ],
          },
        },
      ],
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  })
}

ObjectData.update_user_data = async (user_id, first_name, last_name) => {
  return new Promise(async (res, rej) => {
    try {
      var user_data = await get_users_by_user_id(user_id);
      if (user_data.length > 0) {
        Register.updateOne(
          { _id: ObjectId(user_id) },
          {
            $set: {
              first_name,
              last_name,
            },
          },
          (err, data) => {
            if (err) rej(err);
            else {
              if (data.nModified == 1) res(data);
              else rej("Something went wrong");
            }
          }
        );
      } else {
        rej("No such user");
      }
    } catch (error) {
      rej(error);
    }
  });
};

ObjectData.get_users_data = async (user_id) => {
  return new Promise(async (res, rej) => {
    try {
      var user_data = await get_users_by_user_id(user_id)
      res(user_data)
    } catch (error) {
      rej(error)
    }
  })
}

// ------------------------- UTILITY FUNCTIONS ----------------------------

const get_users_by_email = (email) => {
  return new Promise((resolve, reject) => {
    Register.find({ email: email }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

const get_users_by_uid = (uid) => {
  return new Promise((resolve, reject) => {
    Register.find({ uid: uid }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

const get_users_by_user_id = (user_id) => {
  return new Promise((resolve, reject) => {
    Register.find({ _id: ObjectId(user_id) }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

const getRandomString = () => {
  var randomChars = "0123456789";
  var result = "";
  for (var i = 0; i < 24; i++) {
    result += randomChars.charAt(
      Math.floor(Math.random() * randomChars.length)
    );
  }
  return result;
};

module.exports = ObjectData;
