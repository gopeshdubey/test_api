const response = require("../Response/response");
const vote = require("../Query/vote");

var object_data = {};

object_data.create_listing = async (req, res) => {
  try {
    const {
      logo_url,
      symbol,
      email,
      name,
      contract_address,
      website_link,
      current_price,
      total_coins_in_number,
      air_drop
    } = req.body;
    var user_data = await vote.register_for_listing(
      logo_url,
      symbol,
      email,
      name,
      contract_address,
      website_link,
      current_price,
      total_coins_in_number,
      air_drop
    );
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.cast_vote = async (req, res) => {
  const { symbol, name, user_id } = req.body;
  try {
    var user_data = await vote.update_coin_voting(symbol, name, user_id);
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.increase_vote_energy = async (req, res) => {
  try {
    const { user_id, count } = req.params;
    var user_data = await vote.increase_vote_energy(user_id, count);
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.sorted_listing_coin = async (req, res) => {
  try {
    var { sort_item } = req.params;
    var user_data = await vote.get_sorted_coin(sort_item);
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.start_voting = async (req, res) => {
  try {
    var user_data = await vote.start_voting()
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.get_user_energy_timer = async (req, res) => {
  try {
    const { user_id } = req.params;
    var user_data = await vote.get_user_hourly_time(user_id)
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.get_all_listing_coins = async (req, res) => {
  try {
    var user_data = await vote.get_all_coins()
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.update_status_of_listing_coins = async (req, res) => {
  try {
    const { coin_id, status } = req.params;
    var user_data = await vote.update_status_of_listing_coin(coin_id, status)
    response(res, 200, true, "Success", user_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

module.exports = object_data;
