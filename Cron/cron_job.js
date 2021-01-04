var cron = require("node-cron");
var fs = require("fs");
const file = require('../Backups/users.json')
const votes = require("../Query/vote");

const increase_votes_energy_per_hours = async () => {
  try {
    var vote_data = await votes.update_vote_energy_every_hour();
    console.log("Increase energy in 1 hours is successfull :::::", vote_data);
  } catch (error) {
    console.log("Error in increase in energy level in 1 hours :::::", error);
  }
};

const start_voting = async () => {
  try {
    var vote_data = await votes.start_voting();
    console.log("Start voting in 1 hours is successfull :::::", vote_data);
  } catch (error) {
    console.log("Error in start voting :::::", error);
  }
};

// var wstream = fs.createWriteStream('backup.json')
var crons = async () => {
  var data = await votes.get_users();
  var data1 = await votes.get_all_coins();
  fs.writeFileSync('Backups/users.json', JSON.stringify(data))
  fs.writeFileSync("Backups/voting_coins.json", JSON.stringify(data1))
};

// votes.insert(), // insert backup data in database
// votes.insert_vote_coins()
// crons(),

// cron.schedule("*/5 * * * *", async () => {
//   Promise.all([
//     // increase_votes_energy_per_hours(),
//     // start_voting(),
//   ]);
//   console.log("running a task every 5 min");
// });

module.exports = cron;
