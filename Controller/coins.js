const coins = require("../Query/coins");
const response = require("../Response/response");

var object_data = {};

object_data.create_coin = async (req, res) => {
  try {
    const {
      logo_url,
      symbol,
      email,
      name,
      contract_address,
      website_link,
      token_id,
      token_type,
    } = req.body;
    var coin_data = await coins.create_coin(
      logo_url,
      symbol,
      email,
      name,
      contract_address,
      website_link,
      token_id,
      token_type
    );
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.buy = async (req, res) => {
  try {
    const { user_id, symbol, price, amount, pair_with } = req.body;
    var coin_data = await coins.buy(
      user_id,
      symbol,
      price,
      amount,
      pair_with
    );
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.sell = async (req, res) => {
  try {
    const { user_id, symbol, price, amount, pair_with } = req.body;
    var coin_data = await coins.sell(
      user_id,
      symbol,
      price,
      amount,
      pair_with
    );
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.sell_coin_by_symbol = async (req, res) => {
  try {
    const { user_id, symbol, price, amount, pair_with } = req.body;
    var coin_data = await coins.sell_coin_by_symbol(
      user_id,
      symbol,
      price,
      amount,
      pair_with
    );
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.buy_coin = async (req, res) => {
  try {
    const { user_id, symbol, price, amount, pair_with } = req.body;
    var coin_data = await coins.buy_coin(
      user_id,
      symbol,
      price,
      amount,
      pair_with
    );
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.search_coin = async (req, res) => {
  try {
    const { symbol, pair_with } = req.params;
    var coin_data = await coins.search_coin(symbol, pair_with);
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.get_all_coin_price = async (req, res) => {
  try {
    var coin_data = await coins.get_all_coin_price();
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.get_price_of_coin = async (req, res) => {
  try {
    const { symbol } = req.params;
    var coin_data = await coins.get_price_of_coin(symbol);
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.get_all_coin_for_sell = async (req, res) => {
  try {
    var coin_data = await coins.get_all_coin_for_sell();
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.get_all_coin_for_buy = async (req, res) => {
  try {
    var coin_data = await coins.get_all_coin_for_buy();
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.get_coin_balance_of_users = async (req, res) => {
  try {
    const { user_id, coin_symbol, pair_with } = req.body;
    var coin_data = await coins.get_available_balance_of_coin_and_paired_coin(
      user_id,
      coin_symbol,
      pair_with
    );
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
};

object_data.get_all_pairs_for_coin = async (req, res) => {
  try {
    var coin_data = await coins.get_all_pairs_for_coin()
    response(res, 200, true, "Success", coin_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

object_data.get_balance = async(req, res) => {
  try {
    var { user_id, symbol, pair_with } = req.body;
    console.log(req.body);
    var balance_data = await coins.get_balance_of_both_paired_coin(user_id, symbol, pair_with)
    response(res, 200, true, "Success", balance_data);
  } catch (error) {
    response(res, 400, false, "Error", error);
  }
}

module.exports = object_data;
