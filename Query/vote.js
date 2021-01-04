var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;
var Vote = require("../Model/voting_coin");
var Register = require("../Model/register");
var Backup = require("../Model/Backups/backup_registers");
var BackupVote = require("../Model/Backups/backup_votes");
var dateFormat = require("dateformat");
var doc = require("../Backups/users.json");
var vote_doc = require("../Backups/voting_coins.json");

object_data = {};

object_data.insert = async () => {
  try {
    console.log("len :::::", doc.length);
    for (let i = 0; i < doc.length; i++) {
      const element = doc[i];
      console.log("i :::::", i);
      await Backup.insertMany(element);
    }
    process.exit();
  } catch (error) {
    console.log("error :::::", error);
  }
};

object_data.insert_vote_coins = async () => {
  try {
    console.log("len :::::", vote_doc.length);
    for (let i = 0; i < vote_doc.length; i++) {
      const element = vote_doc[i];
      console.log("i :::::", i);
      await BackupVote.insertMany(element);
    }
    process.exit();
  } catch (error) {
    console.log("error :::::", error);
  }
};

object_data.get_users = () => {
  return new Promise(async (res, rej) => {
    try {
      var data = await Register.find({});
      console.log("data :::::", data);
      res(data);
    } catch (error) {
      rej(error);
    }
  });
};

object_data.get_all_coins = () => {
  return new Promise(async (res, rej) => {
    try {
      var data = await Vote.find({});
      res(data);
    } catch (error) {
      rej(error);
    }
  });
};

object_data.register_for_listing = (
  logo_url,
  symbol,
  email,
  name,
  contract_address,
  website_link,
  current_price,
  total_coins_in_number,
  air_drop
) => {
  return new Promise(async (res, rej) => {
    try {
      var vote_data = await get_coin_by_symbol_and_name(symbol, name);
      if (vote_data.length > 0) rej("Already a listed coin");
      else {
        var vote = new Vote({
          logo_url,
          symbol: symbol.toUpperCase(),
          email,
          name,
          contract_address,
          website_link,
          current_price,
          total_coins_in_number,
          air_drop,
        });
        vote.save((err, data) => {
          if (err) rej(err);
          else res(data);
        });
      }
    } catch (error) {
      rej(error);
    }
  });
};

object_data.get_voting_coin_by_symbol_and_name = (symbol, name) => {
  return new Promise(async (res, rej) => {
    try {
      var vote_data = await get_coin_by_symbol_and_name(symbol, name);
      res(vote_data);
    } catch (error) {
      rej(error);
    }
  });
};

object_data.get_sorted_coin = (sort_item) => {
  return new Promise(async (res, rej) => {
    try {
      var sort_data_array = [
        "trending",
        "top_list",
        "newly_added",
        "already_listed",
      ];
      var output = sort_data_array.includes(sort_item); // returns true or false
      var vote_data = await get_all_vote_listing_coins(
        output ? sort_item : "trending"
      );
      res(vote_data);
    } catch (error) {
      rej(error);
    }
  });
};

object_data.update_coin_voting = async (symbol, name, user_id) => {
  const session = await Vote.startSession();
  session.startTransaction();
  return new Promise(async (res, rej) => {
    try {
      const opts = { session };
      var user_data = await get_user_by_user_id(user_id);
      if (user_data[0].vote_energy > 0) {
        var first = await update_user_data_in_vote(symbol, name, user_id, opts);
        var second = await increase_vote_count_of_coin(symbol, name, opts);
        var third = await decrease_vote_energy(user_id, opts);
        var fourth = await update_energy_time_after_vote(user_id, opts);
        if (
          first.nModified == 1 &&
          second.nModified == 1 &&
          third.nModified == 1 &&
          (fourth.nModified == 1 || fourth == "success")
        ) {
          await session.commitTransaction();
          session.endSession();
          res(first);
        } else {
          await session.abortTransaction();
          session.endSession();
          rej("Something went wrong");
        }
      } else {
        rej("Fill the vote energy");
      }
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      rej(error);
    }
  });
};

const update_energy_time_after_vote = (user_id, opts) => {
  var currentTime = new Date();
  var currentOffset = currentTime.getTimezoneOffset();
  var ISTOffset = 330; // IST offset UTC +5:30
  var current_time = new Date(
    currentTime.getTime() + (ISTOffset + currentOffset) * 60000
  );
  var current_timestamp = Date.parse(current_time);
  var end_timestamp = current_time.setHours(current_time.getHours() + 1);
  return new Promise(async (res, rej) => {
    var user_data = await Register.find({ _id: ObjectId(user_id) });
    if (user_data[0].vote_energy == user_data[0].energy_limit) {
      Register.updateOne(
        { _id: ObjectId(user_id) },
        {
          $set: {
            check_for_hour_completion: end_timestamp,
          },
        },
        opts,
        (err, data) => {
          if (err) rej(err);
          else res(data);
        }
      );
    } else res("success");
  });
};

object_data.increase_vote_energy = (user_id, count) => {
  return new Promise(async (res, rej) => {
    try {
      var vote_data = await increase_vote_energy(user_id, count);
      if (vote_data.nModified == 1) res(vote_data);
      else rej("Something went wrong");
    } catch (error) {
      rej(error);
    }
  });
};

object_data.update_vote_energy_every_hour = () => {
  return new Promise(async (res, rej) => {
    var currentTime = new Date();
    var currentOffset = currentTime.getTimezoneOffset();
    var ISTOffset = 330; // IST offset UTC +5:30
    var current_time = new Date(
      currentTime.getTime() + (ISTOffset + currentOffset) * 60000
    );
    var current_timestamp = Date.parse(current_time);
    var end_timestamp = current_time.setHours(current_time.getHours() + 1);

    Register.aggregate(
      [
        {
          $match: {
            $and: [
              {
                $expr: {
                  $lt: ["$vote_energy", "$energy_limit"],
                },
              },
              {
                $expr: {
                  $lt: ["$check_for_hour_completion", current_timestamp],
                },
              },
            ],
          },
        },
      ],
      async (err, data) => {
        console.log("data len :::::", data.length);
        if (err) rej(err);
        else {
          for (let i = 0; i < data.length; i++) {
            const element = data[i];
            try {
              await increase_energy1(element.email);
              await change_hourly_time1(element.email, end_timestamp);
            } catch (error) {
              console.log("Error in ", element._id, "------:::::", error);
            }
          }
          res({ data: "Success", current_timestamp });
        }
      }
    );
  });
};

const increase_energy1 = (email) => {
  return new Promise((res, rej) => {
    Register.updateOne(
      { email },
      {
        $inc: {
          vote_energy: 1,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else {
          if (data.nModified > 0) {
            res(data);
          } else rej("Failed");
        }
      }
    );
  });
};

const change_hourly_time1 = (email, time) => {
  return new Promise((res, rej) => {
    Register.updateOne(
      { email },
      {
        $set: {
          check_for_hour_completion: time,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else {
          if (data.nModified > 0) {
            res(data);
          } else rej("Failed");
        }
      }
    );
  });
};

const increase_energy = (email, opts) => {
  return new Promise((res, rej) => {
    Register.updateOne(
      { email },
      {
        $inc: {
          vote_energy: 1,
        },
      },
      opts,
      (err, data) => {
        if (err) rej(err);
        else {
          if (data.nModified > 0) {
            res(data);
          } else rej("Failed");
        }
      }
    );
  });
};

const change_hourly_time = (email, time, opts) => {
  return new Promise((res, rej) => {
    Register.updateOne(
      { email },
      {
        $set: {
          check_for_hour_completion: time,
        },
      },
      opts,
      (err, data) => {
        if (err) rej(err);
        else {
          if (data.nModified > 0) {
            res(data);
          } else rej("Failed");
        }
      }
    );
  });
};

object_data.get_user_hourly_time = (user_id) => {
  return new Promise((res, rej) => {
    var usersProjection = {
      deposit_data: false,
      balance_data: false,
      withdraw_data: false,
      open_orders_data: false,
    };
    var currentTime = new Date();
    var currentOffset = currentTime.getTimezoneOffset();
    var ISTOffset = 330; // IST offset UTC +5:30
    var current_time = new Date(
      currentTime.getTime() + (ISTOffset + currentOffset) * 60000
    );
    var current_timestamp = Date.parse(current_time);
    var end_timestamp = current_time.setHours(current_time.getHours() + 1);
    Register.find(
      { _id: ObjectId(user_id) },
      usersProjection,
      async (err, data) => {
        if (err) rej(err);
        else {
          var {
            check_for_hour_completion,
            vote_energy,
            energy_limit,
            email,
          } = data[0];
          if (
            current_timestamp > check_for_hour_completion &&
            vote_energy < energy_limit
          ) {
            const session = await Register.startSession();
            session.startTransaction();
            const opts = { session };
            try {
              var inc = await increase_energy(email, opts);
              var hour = await change_hourly_time(email, end_timestamp, opts);
              await session.commitTransaction();
              session.endSession();
              var user_data = await Register.find(
                { _id: ObjectId(user_id) },
                usersProjection
              );
              res({
                data: user_data,
                current_timestamp,
              });
            } catch (error) {
              await session.abortTransaction();
              session.endSession();
              console.log("Error in updating user energy :::::", error);
              res({
                data,
                current_timestamp,
              });
            }
          } else {
            res({
              data,
              current_timestamp,
            });
          }
        }
      }
    );
  });
};

object_data.start_voting = async () => {
  const session = await Register.startSession();
  session.startTransaction();
  const second_session = await Vote.startSession();
  second_session.startTransaction();
  var currentTime = new Date();
  var currentOffset = currentTime.getTimezoneOffset();
  var ISTOffset = 330; // IST offset UTC +5:30
  var current_time = new Date(
    currentTime.getTime() + (ISTOffset + currentOffset) * 60000
  );
  var current_timestamp = Date.parse(current_time);
  var end_timestamp = current_time.setDate(current_time.getDate() + 7);

  return new Promise(async (res, rej) => {
    try {
      var admin_data = await get_admin();
      if (admin_data.length == 0) rej("No Admin Exist");
      else {
        if (
          admin_data[0].voting_deadline < current_timestamp ||
          admin_data[0].voting_deadline == null
        ) {
          const opts = { session };
          const second_opts = { second_session };
          var round_data = await update_vote_round(admin_data[0]._id, opts);
          var vote_data = await update_voting_deadline(
            admin_data[0].email,
            end_timestamp,
            opts
          );
          var admin_data = await get_admin();
          var find_vote_data = await get_all_voting_list();
          var success_data = [];
          for (let i = 0; i < find_vote_data.length; i++) {
            const element = find_vote_data[i];
            var { _id, current_round_votes } = element;
            var vote_round_data = await update_voting_round_data(
              _id,
              admin_data[0].voting_round,
              current_round_votes,
              second_opts
            );
            if (vote_round_data.nModified == 1)
              success_data.push(vote_round_data.nModified);
          }
          if (
            vote_data.nModified == 1 &&
            round_data.nModified == 1 &&
            find_vote_data.length == success_data.length
          ) {
            var badges_data = await get_top_4_users();
            var badge_count = 4;

            for (let i = 0; i < badges_data.length; i++) {
              const element = badges_data[i];
              Vote.updateOne(
                { _id: ObjectId(element._id) },
                {
                  $inc: {
                    won_badges: badge_count,
                  },
                },
                (err, data) => {
                  if (err) console.log({ err });
                  else console.log({ data });
                }
              );
              badge_count--;
            }

            var b_data = await get_vote_of_12_badges();
            for (let i = 0; i < b_data.length; i++) {
              const element = b_data[i];
              Vote.updateOne(
                { _id: ObjectId(element._id) },
                {
                  $set: {
                    status_from_admin: "listed",
                  },
                },
                (err, data) => {
                  if (err) console.log({ err });
                  else console.log({ data });
                }
              );
            }
            await session.commitTransaction();
            session.endSession();
            await second_session.commitTransaction();
            second_session.endSession();
            res({
              current_timestamp,
              new_deadline: end_timestamp,
            });
          } else {
            await session.abortTransaction();
            session.endSession();
            await second_session.abortTransaction();
            second_session.endSession();
            rej("Error in start vote");
          }
        } else {
          await session.abortTransaction();
          session.endSession();
          await second_session.abortTransaction();
          second_session.endSession();
          var new_deadline = admin_data[0].voting_deadline;
          console.log("new deadline :::::", new_deadline);
          res({
            current_timestamp,
            new_deadline,
          });
        }
      }
    } catch (error) {
      rej(error);
    }
  });
};

const get_top_4_users = () => {
  return new Promise(async (res, rej) => {
    var vote_data = await Vote.find({
      status_from_admin: "active",
      current_round_votes: {
        $gte: 1000,
      },
    })
      .sort({ current_round_votes: -1 })
      .limit(4);
    res(vote_data);
  });
};

const get_vote_of_12_badges = () => {
  return new Promise(async (res, rej) => {
    var vote_data = await Vote.find(
      {
        status_from_admin: "active",
        won_badges: {
          $gte: 12,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

object_data.update_status_of_listing_coin = (coin_id, status) => {
  // status - disabled or active or listed
  return new Promise((res, rej) => {
    Vote.update(
      { _id: ObjectId(coin_id) },
      {
        $set: {
          status_from_admin: status,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else if (data.nModified < 1) rej("Something went wrong");
        else res(data);
      }
    );
  });
};

const update_voting_round_data = (
  voting_id,
  voting_round,
  total_votes,
  opts
) => {
  return new Promise((res, rej) => {
    Vote.updateOne(
      { _id: ObjectId(voting_id) },
      {
        $push: {
          voting_round_data: {
            voting_round,
            total_votes,
          },
        },
        $set: {
          current_round_votes: 0,
        },
      },
      opts,
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const get_all_voting_list = () => {
  return new Promise((res, rej) => {
    Vote.find({}, (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
};

const update_vote_round = (user_id, opts) => {
  return new Promise((res, rej) => {
    Register.updateOne(
      { _id: ObjectId(user_id) },
      {
        $inc: {
          voting_round: 1,
        },
      },
      opts,
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const get_admin = () => {
  return new Promise((res, rej) => {
    Register.find({ is_admin: true }, (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
};

const update_voting_deadline = (email, voting_deadline, opts) => {
  return new Promise((res, rej) => {
    Register.updateOne(
      { email },
      {
        $set: {
          voting_deadline,
        },
      },
      opts,
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const decrease_vote_energy = (user_id, opts) => {
  return new Promise((res, rej) => {
    Register.updateOne(
      { _id: ObjectId(user_id), vote_energy: { $gt: 0 } },
      {
        $inc: {
          vote_energy: -1,
        },
      },
      opts,
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const get_user_by_user_id = (user_id) => {
  return new Promise((res, rej) => {
    Register.find({ _id: ObjectId(user_id) }, (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
};

const get_all_vote_listing_coins = (sort_item) => {
  console.log("sorted item :::::", sort_item);
  return new Promise(async (res, rej) => {
    try {
      var sort =
        sort_item == "trending"
          ? { current_round_votes: -1 }
          : sort_item == "top_list"
          ? { total_votes: -1 }
          : sort_item == "newly_added"
          ? (sort = { _id: -1 })
          : { current_round_votes: -1 };

      var search =
        sort_item == "already_listed"
          ? { status_from_admin: "listed" }
          : { status_from_admin: "active" };
      var data = await Vote.find(search).sort(sort);
      res(data);
    } catch (error) {
      rej(error);
    }
  });
};

const get_coin_by_symbol_and_name = (symbol, name) => {
  return new Promise((res, err) => {
    Vote.find({ symbol: symbol.toUpperCase(), name }, (error, data) => {
      if (error) err(error);
      else res(data);
    });
  });
};

const get_all_users = () => {
  return new Promise((res, rej) => {
    Register.find({}, (error, data) => {
      if (error) rej(error);
      else res(data);
    });
  });
};

const increase_vote_energy = (user_id, count) => {
  return new Promise((res, rej) => {
    Register.updateOne(
      { _id: ObjectId(user_id) },
      {
        $inc: {
          vote_energy: count,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const increase_vote_count_of_coin = (symbol, name, opts) => {
  return new Promise((res, rej) => {
    Vote.updateOne(
      { symbol: symbol.toUpperCase(), name },
      {
        $inc: {
          current_round_votes: 1,
          total_votes: 1,
        },
      },
      opts,
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const update_user_data_in_vote = (symbol, name, user_id, opts) => {
  return new Promise((res, rej) => {
    Vote.find(
      {
        symbol: symbol.toUpperCase(),
        name,
        "vote_data.user_id": ObjectId(user_id),
      },
      async (err, data) => {
        if (err) rej(err);
        else {
          try {
            if (data.length == 0) {
              var first = await insert_user_object_in_vote(
                symbol,
                name,
                user_id,
                opts
              );
              res(first);
            } else {
              var second = await update_vote_of_user_array(
                symbol,
                name,
                user_id,
                opts
              );
              res(second);
            }
          } catch (error) {
            rej(error);
          }
        }
      }
    );
  });
};

const update_vote_of_user_array = (symbol, name, user_id, opts) => {
  return new Promise((res, rej) => {
    Vote.updateOne(
      {
        symbol: symbol.toUpperCase(),
        name,
        "vote_data.user_id": ObjectId(user_id),
      },
      {
        $inc: {
          "vote_data.$.total_casted_votes": 1,
        },
      },
      opts,
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};
const insert_user_object_in_vote = (symbol, name, user_id, opts) => {
  return new Promise((res, rej) => {
    Vote.updateOne(
      {
        symbol: symbol.toUpperCase(),
        name,
      },
      {
        $push: {
          vote_data: {
            user_id: ObjectId(user_id),
            total_casted_votes: 1,
          },
        },
      },
      opts,
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

module.exports = object_data;
