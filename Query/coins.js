var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;

const { get_balance_of_trc20, transfer_trc20 } = require("../Utils/trc20");
const { Pairs } = require("../Utils/pairs");
const Coins = require("../Model/coin");
const Users = require("../Model/register");
const wallet = require("../Model/wallet");

var object_data = {};

const current_date = () => {
  var currentdate = new Date();
  var datetime =
    currentdate.getDate() +
    "/" +
    (currentdate.getMonth() + 1) +
    "/" +
    currentdate.getFullYear() +
    "@" +
    currentdate.getHours() +
    ":" +
    currentdate.getMinutes() +
    ":" +
    currentdate.getSeconds();
  return datetime;
};

object_data.create_coin = (
  logo_url,
  symbol,
  email,
  name,
  contract_address,
  website_link,
  token_id,
  token_type
) => {
  return new Promise(async (resolve, reject) => {
    try {
      var coin_data = await get_coin_by_name(name);
      var symbol_data = await get_coin_by_symbol_only(symbol);
      if (coin_data.length > 0 || symbol_data.length > 0)
        reject("Already registered coin");
      else {
        var coins = new Coins({
          logo_url,
          symbol: symbol.toUpperCase(),
          email,
          name,
          contract_address,
          website_link,
          token_id,
          token_type,
        });
        coins.save((err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      }
    } catch (error) {
      reject(error);
    }
  });
};

const get_coin_by_symbol_only = (symbol) => {
  return new Promise((res, rej) => {
    Coins.find({ symbol: symbol.toUpperCase() }, (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
};

const get_coin_by_name = (name) => {
  return new Promise((resolve, reject) => {
    Coins.find({ name: name }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

object_data.buy = (user_id, symbol, price, amount, pair_with, io) => {
  return new Promise(async (res, rej) => {
    const session = await Users.startSession();
    session.startTransaction();
    const session1 = await Coins.startSession();
    session1.startTransaction();
    const opts = { session };
    const opts1 = { session1 };
    try {
      // GET COIN BY ITS SYMBOL FROM COIN TABLE
      var symbol_data = await get_coin_by_symbol(symbol);
      if (symbol_data.length > 0) {
        // GET USER'S PAIR_WITH COIN BALANCE
        var balance_data = await get_user_balance_from_register_table(
          user_id,
          pair_with
        );

        // GET USER'S SYMBOL COIN BALANCE
        var balance_data1 = await get_user_balance_from_register_table(
          user_id,
          symbol
        );

        // PAIR_WITH BALANCE OF USER
        var simple_balance =
          balance_data.length == 0
            ? 0
            : parseFloat(
                balance_data[0].balance_data.available_balance_of_coin
              );

        // SYMBOL BALANCE OF USER
        var simple_balance1 =
          balance_data1.length == 0
            ? 0
            : parseFloat(
                balance_data1[0].balance_data.available_balance_of_coin
              );

        // PAIR_WITH BALANCE OF USER
        var balance = parseFloat(parseFloat(simple_balance).toFixed(8));

        // SYMBOL BALANCE OF USER
        var balance1 = parseFloat(parseFloat(simple_balance1).toFixed(8));

        var decimal_amount = parseFloat(parseFloat(amount).toFixed(8));

        var total = parseFloat(parseFloat(price * amount).toFixed(8));

        console.log({ balance, total });

        if (total <= balance) {
          // FETCH DATA WHICH MATCH WITH SYMBOL, PRICE, SIDE = SELL AND PAIR_WITH IN COIN TABLE
          var coin_data = await get_coin_of_sell_in_coin_table(
            symbol,
            price,
            "BUY",
            pair_with
          );

          var updated_data, open_order;

          if (coin_data.length > 0) {
            // UPDATE AMOUNT AND TOTAL WITH NEW OBJECT IN USER_DATA IN COIN TABLE
            var table_amount, table_total, new_amount, new_total;

            table_amount = coin_data[0].last_price.amount;

            table_total = coin_data[0].last_price.total;

            new_amount = amount + table_amount;

            var add_data = price * amount;
            var demo_total = add_data + table_total;

            new_total = parseFloat(parseFloat(demo_total).toFixed(8));

            var user_data = {
              user_id: ObjectId(user_id),
              amount: parseFloat(parseFloat(amount).toFixed(8)),
            };

            updated_data = await update_last_price_and_user_data(
              symbol,
              price,
              "BUY",
              pair_with,
              new_amount,
              new_total,
              user_data,
              opts1
            );

            // updated_data.nModified > 0

            // GET USER_DATA ARRAY INSIDE LAST_PRICE ARRAY IN DESCENDING ORDER LIMIT 1
            var sorted_data = await get_user_data_in_last_price_in_coin_table_in_descending(
              symbol,
              price,
              "BUY",
              pair_with
            );

            var currentdate = await current_date();

            var open_orders_data = {
              date: currentdate,
              user_order_id: sorted_data[0].last_price.user_data._id,
              pair_from: symbol.toUpperCase(),
              pair_to: pair_with.toUpperCase(),
              side: "BUY",
              price: parseFloat(parseFloat(price).toFixed(8)),
              amount: parseFloat(parseFloat(amount).toFixed(8)),
              total,
              status: "pending",
            };

            // PUSH OBJECT IN OPENS_ORDER_DATA OF USER IN REGISTER TABLE
            open_order = await push_object_in_open_orders_data_in_register_table(
              user_id,
              open_orders_data,
              opts
            );
          } else {
            // PUSH NEW OBJECT IN LAST_PRICE WITH NEW OBJECT IN USER_DATA IN COIN TABLE

            var last_price = {
              price: parseFloat(parseFloat(price).toFixed(8)),
              amount: parseFloat(parseFloat(amount).toFixed(8)),
              total,
              pair_with: pair_with.toUpperCase(),
              side: "BUY",
              change_in_percentage: 0,
              user_data: {
                user_id: ObjectId(user_id),
                amount: parseFloat(parseFloat(amount).toFixed(8)),
              },
            };

            updated_data = await push_last_price_and_user_data(
              symbol,
              last_price,
              opts1
            );

            // updated_data.nModified > 0

            // GET USER_DATA ARRAY INSIDE LAST_PRICE ARRAY IN DESCENDING ORDER LIMIT 1
            var sorted_data = await get_user_data_in_last_price_in_coin_table_in_descending(
              symbol,
              price,
              "BUY",
              pair_with
            );

            var currentdate = await current_date();

            var open_orders_data = {
              date: currentdate,
              user_order_id: sorted_data[0].last_price.user_data._id,
              pair_from: symbol.toUpperCase(),
              pair_to: pair_with.toUpperCase(),
              side: "BUY",
              price: parseFloat(parseFloat(price).toFixed(8)),
              amount: parseFloat(parseFloat(amount).toFixed(8)),
              total,
              status: "pending",
            };

            // PUSH OBJECT IN OPENS_ORDER_DATA OF USER IN REGISTER TABLE
            open_order = await push_object_in_open_orders_data_in_register_table(
              user_id,
              open_orders_data,
              opts
            );
          }

          if (updated_data.nModified > 0 && open_order.nModified > 0) {
            await session.commitTransaction();
            session.endSession();
            await session1.commitTransaction();
            session1.endSession();

            var highest_bid = await get_lowest_or_less_than_and_equal_sell_bid(
              symbol,
              pair_with,
              price
            );

            var seller_last_price_id = sorted_data[0].last_price._id;

            var seller_user_data_id = sorted_data[0].last_price.user_data._id;

            console.log({ length: highest_bid.length });

            if (highest_bid.length == 0) {

              var content = await object_data.get_all_coin_for_buy()

              io.emit("message", {content});

              res("Success");
            } else {
              var new_decimal_amount = decimal_amount;

              // NEW CODE

              for await (const [i, highest_bid_element] of highest_bid.entries()) {
                if (new_decimal_amount == 0 || new_decimal_amount < 0) break;

                var last_price_id = highest_bid_element.last_price._id;

                var bid_amount = 0;

                // ADD ALL AMOUNTS WHICH ARE IN LAST_PRICE USER_DATA IN COIN TABLE
                await Promise.all(
                  highest_bid_element.last_price.user_data.map(
                    (data) => (bid_amount = bid_amount + data.amount)
                  )
                );

                console.log({ bid_amount });

                // GET SORTED USER_DATA IN COIN TABLE, STORE IN ARRAY AND THEN DELETE IT FROM DATABASE
                var sorted_user_data = await get_sorted_user_data_in_last_price_in_coin_table_for_by_last_price_id(
                  last_price_id,
                  symbol,
                  pair_with
                );

                if (bid_amount == new_decimal_amount) {

                  for await (const element of sorted_user_data) {
                    // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                    var uid = element.last_price.user_data.user_id;

                    var user_data_id = element.last_price.user_data._id;

                    var user_data_who_filling_the_bid = {
                      bidder_id: ObjectId(user_id),
                      amount: element.last_price.user_data.amount,
                    };

                    await update_open_orders_data_pending_to_confirmed(
                      uid,
                      user_data_id,
                      user_data_who_filling_the_bid
                    );

                    // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                    var user_data_who_filling_the_bid1 = {
                      bidder_id: ObjectId(element.last_price.user_data.user_id),
                      amount: element.last_price.user_data.amount,
                    };

                    await update_open_orders_data_pending_to_confirmed(
                      user_id,
                      seller_user_data_id,
                      user_data_who_filling_the_bid1
                    );

                    // INCREMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                    var decrement_amount = parseFloat(
                      parseFloat(
                        element.last_price.user_data.amount * price
                      ).toFixed(8)
                    );
                    await update_balance_of_coin_of_user(
                      uid,
                      pair_with,
                      decrement_amount
                    );

                    // DECREMENT SYMBOL BALANCE FROM BUYER USER TABLE
                    var increment_amount = element.last_price.user_data.amount;
                    await update_balance_of_coin_of_user(
                      uid,
                      symbol,
                      -increment_amount
                    );

                    // INCREMENT SYMBOL BALANCE FROM SELLER USER TABLE
                    var decrement_amount = element.last_price.user_data.amount;
                    await update_balance_of_coin_of_user(
                      user_id,
                      symbol,
                      decrement_amount
                    );

                    // DECREMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                    var increment_amount = parseFloat(
                      parseFloat(
                        element.last_price.user_data.amount * price
                      ).toFixed(8)
                    );
                    await update_balance_of_coin_of_user(
                      user_id,
                      pair_with,
                      -increment_amount
                    );
                  }

                  var buyer_last_price_id = sorted_user_data[0].last_price._id;

                  // DELETE LAST_PRICE BID FOR BUY BY LAST_PRICE_ID
                  await delete_bid_data_of_symbol_by_last_price_id(
                    symbol,
                    buyer_last_price_id
                  );

                  // DELETE LAST_PRICE BID FOR SELL BY LAST_PRICE_ID
                  await delete_bid_data_of_symbol_by_last_price_id(
                    symbol,
                    seller_last_price_id
                  );

                  new_decimal_amount = 0;
                } else {
                  // AMOUNT IS LESS THAN
                  if (bid_amount > new_decimal_amount) {
                    console.log(
                      ":: BID AMOUNT IS GREATER THAN DECIMAL AMOUNT ::"
                    );

                    // 20 > 10  10 is bidded amount
                    var edit = new_decimal_amount;

                    for await (const element of sorted_user_data) {
                      var uid = element.last_price.user_data.user_id;

                      var last_price_id = element.last_price._id;

                      var user_data_id = element.last_price.user_data._id;

                      var buyer_amount = element.last_price.user_data.amount;

                      if (edit == 0 || edit < 0) break;

                      if (buyer_amount == edit) {
                        console.log(":: equal to ::");
                        // 2 == 2
                        // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                        var user_data_who_filling_the_bid = {
                          bidder_id: ObjectId(user_id),
                          amount: element.last_price.user_data.amount,
                        };

                        await update_open_orders_data_pending_to_confirmed(
                          uid,
                          user_data_id,
                          user_data_who_filling_the_bid
                        );

                        // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                        var user_data_who_filling_the_bid1 = {
                          bidder_id: ObjectId(
                            element.last_price.user_data.user_id
                          ),
                          amount: element.last_price.user_data.amount,
                        };

                        await update_open_orders_data_pending_to_confirmed(
                          user_id,
                          seller_user_data_id,
                          user_data_who_filling_the_bid1
                        );

                        // INCREMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                        var decrement_amount = parseFloat(
                          parseFloat(
                            element.last_price.user_data.amount * price
                          ).toFixed(8)
                        );
                        await update_balance_of_coin_of_user(
                          uid,
                          pair_with,
                          decrement_amount
                        );

                        // DECREMENT SYMBOL BALANCE FROM BUYER USER TABLE
                        var increment_amount =
                          element.last_price.user_data.amount;
                        await update_balance_of_coin_of_user(
                          uid,
                          symbol,
                          -increment_amount
                        );

                        // INCREMENT SYMBOL BALANCE FROM SELLER USER TABLE
                        var decrement_amount =
                          element.last_price.user_data.amount;
                        await update_balance_of_coin_of_user(
                          user_id,
                          symbol,
                          decrement_amount
                        );

                        // DECREMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                        var increment_amount = parseFloat(
                          parseFloat(
                            element.last_price.user_data.amount * price
                          ).toFixed(8)
                        );

                        await update_balance_of_coin_of_user(
                          user_id,
                          pair_with,
                          -increment_amount
                        );

                        // DELETE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                        await delete_user_data_object_from_last_price_in_coin_table(
                          symbol,
                          last_price_id,
                          user_data_id
                        );

                        // DELETE LAST_PRICE BID FOR SELL BY LAST_PRICE_ID
                        await delete_bid_data_of_symbol_by_last_price_id(
                          symbol,
                          seller_last_price_id
                        );
                      } else {
                        if (buyer_amount < edit) {
                          console.log(":: amount less than ::");
                          // 10 < 20
                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid = {
                            bidder_id: ObjectId(user_id),
                            amount: element.last_price.user_data.amount,
                          };

                          await update_open_orders_data_pending_to_confirmed(
                            uid,
                            user_data_id,
                            user_data_who_filling_the_bid
                          );

                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid1 = {
                            bidder_id: ObjectId(
                              element.last_price.user_data.user_id
                            ),
                            amount: element.last_price.user_data.amount,
                          };
                          await update_open_orders_data_pending_to_confirmed(
                            user_id,
                            seller_user_data_id,
                            user_data_who_filling_the_bid1
                          );

                          // INCREMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount * price
                            ).toFixed(8)
                          );

                          await update_balance_of_coin_of_user(
                            uid,
                            pair_with,
                            decrement_amount
                          );

                          // DECREMENT SYMBOL BALANCE FROM BUYER USER TABLE
                          var increment_amount =
                            element.last_price.user_data.amount;
                          await update_balance_of_coin_of_user(
                            uid,
                            symbol,
                            -increment_amount
                          );

                          // INCREMENT SYMBOL BALANCE FROM SELLER USER TABLE
                          var decrement_amount =
                            element.last_price.user_data.amount;
                          await update_balance_of_coin_of_user(
                            user_id,
                            symbol,
                            decrement_amount
                          );

                          // DECREMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount * price
                            ).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            user_id,
                            pair_with,
                            -increment_amount
                          );

                          // DELETE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                          await delete_user_data_object_from_last_price_in_coin_table(
                            symbol,
                            last_price_id,
                            user_data_id
                          );

                          edit = edit - element.last_price.user_data.amount;
                        } else {
                          console.log(":: amount greater ::");
                          // BUYER_AMOUNT > EDIT
                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          // AND ALSO UPDATE AMOUNT
                          var update_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount - edit
                            ).toFixed(8)
                          );

                          var user_data_who_filling_the_bid = {
                            bidder_id: ObjectId(user_id),
                            amount: parseFloat(parseFloat(edit).toFixed(8)),
                          };

                          await update_open_orders_data_amount(
                            uid,
                            user_data_id,
                            update_amount,
                            user_data_who_filling_the_bid
                          );

                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid1 = {
                            bidder_id: ObjectId(
                              element.last_price.user_data.user_id
                            ),
                            amount: parseFloat(parseFloat(edit).toFixed(8)),
                          };

                          await update_open_orders_data_pending_to_confirmed(
                            user_id,
                            seller_user_data_id,
                            user_data_who_filling_the_bid1
                          );

                          // INCREMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(edit * price).toFixed(8)
                          );

                          await update_balance_of_coin_of_user(
                            uid,
                            pair_with,
                            decrement_amount
                          );

                          // DECREMENT SYMBOL BALANCE FROM BUYER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(edit).toFixed(8)
                          );

                          await update_balance_of_coin_of_user(
                            uid,
                            symbol,
                            -increment_amount
                          );

                          // INCREMENT SYMBOL BALANCE FROM SELLER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(edit).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            user_id,
                            symbol,
                            decrement_amount
                          );

                          // DECREMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(edit * price).toFixed(8)
                          );

                          await update_balance_of_coin_of_user(
                            user_id,
                            pair_with,
                            -increment_amount
                          );

                          // UPDATE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                          await update_user_data_object_from_last_price_in_coin_table(
                            symbol,
                            last_price_id,
                            user_data_id,
                            update_amount
                          );

                          edit = 0;
                        }
                      }

                      await delete_empty_user_data_last_price(
                        last_price_id,
                        symbol
                      );
                    }

                    // DELETE OBJECT OF SELLER BID FROM LAST_PRICE
                    await delete_bid_data_of_symbol_by_last_price_id(
                      symbol,
                      seller_last_price_id
                    );

                    new_decimal_amount = 0;
                  } else {
                    console.log(":: BID AMOUNT LESS THAN DECIMAL AMOUNT ::");

                    var edit = new_decimal_amount;

                    for await (const element of sorted_user_data) {
                      var uid = element.last_price.user_data.user_id;

                      var last_price_id = element.last_price._id;

                      var user_data_id = element.last_price.user_data._id;

                      var buyer_amount = element.last_price.user_data.amount;

                      if (edit == 0 || edit < 0) break;

                      if (buyer_amount == edit) {
                        console.log(":: equal to ::");
                        // 2 == 2
                        // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                        var user_data_who_filling_the_bid = {
                          bidder_id: ObjectId(user_id),
                          amount: element.last_price.user_data.amount,
                        };

                        await update_open_orders_data_pending_to_confirmed(
                          uid,
                          user_data_id,
                          user_data_who_filling_the_bid
                        );

                        // UPDATE OPEN_ORDER_DATA AMOUNT OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                        var user_data_who_filling_the_bid1 = {
                          bidder_id: ObjectId(
                            element.last_price.user_data.user_id
                          ),
                          amount: element.last_price.user_data.amount,
                        };

                        var seller_database_amount = await get_user_open_order_data_amount(
                          user_id,
                          seller_user_data_id
                        );

                        var seller_amount = parseFloat(
                          parseFloat(
                            seller_database_amount[0].open_orders_data.amount -
                              element.last_price.user_data.amount
                          ).toFixed(8)
                        );

                        var seller_total = parseFloat(
                          parseFloat(seller_amount * price).toFixed(8)
                        );

                        await update_open_orders_data_amount(
                          user_id,
                          seller_user_data_id,
                          seller_amount,
                          user_data_who_filling_the_bid1
                        );

                        // INCREMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                        var decrement_amount = parseFloat(
                          parseFloat(
                            element.last_price.user_data.amount * price
                          ).toFixed(8)
                        );

                        await update_balance_of_coin_of_user(
                          uid,
                          pair_with,
                          decrement_amount
                        );

                        // DECREMENT SYMBOL BALANCE FROM BUYER USER TABLE
                        var increment_amount =
                          element.last_price.user_data.amount;

                        await update_balance_of_coin_of_user(
                          uid,
                          symbol,
                          -increment_amount
                        );

                        // INCREMENT SYMBOL BALANCE FROM SELLER USER TABLE
                        var decrement_amount =
                          element.last_price.user_data.amount;

                        await update_balance_of_coin_of_user(
                          user_id,
                          symbol,
                          decrement_amount
                        );

                        // DECREMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                        var increment_amount = parseFloat(
                          parseFloat(
                            element.last_price.user_data.amount * price
                          ).toFixed(8)
                        );

                        await update_balance_of_coin_of_user(
                          user_id,
                          pair_with,
                          -increment_amount
                        );

                        // DELETE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                        await delete_user_data_object_from_last_price_in_coin_table(
                          symbol,
                          last_price_id,
                          user_data_id
                        );

                        // DELETE LAST_PRICE BID FOR SELL BY LAST_PRICE_ID
                        await delete_bid_data_of_symbol_by_last_price_id(
                          symbol,
                          seller_last_price_id
                        );

                        edit = 0;
                      } else {
                        if (buyer_amount < edit) {
                          console.log(":: amount less than ::");
                          // 10 < 20
                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid = {
                            bidder_id: ObjectId(user_id),
                            amount: element.last_price.user_data.amount,
                          };

                          await update_open_orders_data_pending_to_confirmed(
                            uid,
                            user_data_id,
                            user_data_who_filling_the_bid
                          );

                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid1 = {
                            bidder_id: ObjectId(
                              element.last_price.user_data.user_id
                            ),
                            amount: element.last_price.user_data.amount,
                          };

                          var seller_database_amount = await get_user_open_order_data_amount(
                            user_id,
                            seller_user_data_id
                          );

                          var seller_amount = parseFloat(
                            parseFloat(
                              seller_database_amount[0].open_orders_data
                                .amount - element.last_price.user_data.amount
                            ).toFixed(8)
                          );

                          var seller_total = parseFloat(
                            parseFloat(seller_amount * price).toFixed(8)
                          );

                          await update_open_orders_data_amount(
                            user_id,
                            seller_user_data_id,
                            seller_amount,
                            user_data_who_filling_the_bid1
                          );

                          // INCREMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount * price
                            ).toFixed(8)
                          );

                          await update_balance_of_coin_of_user(
                            uid,
                            pair_with,
                            decrement_amount
                          );

                          // DECREMENT SYMBOL BALANCE FROM BUYER USER TABLE
                          var increment_amount =
                            element.last_price.user_data.amount;

                          await update_balance_of_coin_of_user(
                            uid,
                            symbol,
                            -increment_amount
                          );

                          // INCREMENT SYMBOL BALANCE FROM SELLER USER TABLE
                          var decrement_amount =
                            element.last_price.user_data.amount;
                          await update_balance_of_coin_of_user(
                            user_id,
                            symbol,
                            decrement_amount
                          );

                          // DECREMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount * price
                            ).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            user_id,
                            pair_with,
                            -increment_amount
                          );

                          // DELETE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                          await delete_user_data_object_from_last_price_in_coin_table(
                            symbol,
                            last_price_id,
                            user_data_id
                          );

                          edit = edit - element.last_price.user_data.amount;
                        } else {
                          console.log(":: amount greater ::");
                          // BUYER_AMOUNT > EDIT
                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          // AND ALSO UPDATE AMOUNT
                          var update_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount - edit
                            ).toFixed(8)
                          );

                          var user_data_who_filling_the_bid = {
                            bidder_id: ObjectId(user_id),
                            amount: parseFloat(parseFloat(edit).toFixed(8)),
                          };
                          await update_open_orders_data_amount(
                            uid,
                            user_data_id,
                            update_amount,
                            user_data_who_filling_the_bid
                          );

                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid1 = {
                            bidder_id: ObjectId(
                              element.last_price.user_data.user_id
                            ),
                            amount: parseFloat(parseFloat(edit).toFixed(8)),
                          };

                          var seller_database_amount = await get_user_open_order_data_amount(
                            user_id,
                            seller_user_data_id
                          );

                          var seller_amount = parseFloat(
                            parseFloat(
                              seller_database_amount[0].open_orders_data
                                .amount - element.last_price.user_data.amount
                            ).toFixed(8)
                          );

                          var seller_total = parseFloat(
                            parseFloat(seller_amount * price).toFixed(8)
                          );

                          await update_open_orders_data_amount(
                            user_id,
                            seller_user_data_id,
                            seller_amount,
                            user_data_who_filling_the_bid1
                          );

                          // INCREMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(edit * price).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            uid,
                            pair_with,
                            decrement_amount
                          );

                          // DECREMENT SYMBOL BALANCE FROM BUYER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(edit).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            uid,
                            symbol,
                            -increment_amount
                          );

                          // INCREMENT SYMBOL BALANCE FROM SELLER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(edit).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            user_id,
                            symbol,
                            decrement_amount
                          );

                          // DECREMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(edit * price).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            user_id,
                            pair_with,
                            -increment_amount
                          );

                          // UPDATE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                          await update_user_data_object_from_last_price_in_coin_table(
                            symbol,
                            last_price_id,
                            user_data_id,
                            update_amount
                          );

                          edit = edit - element.last_price.user_data.amount;
                        }
                      }

                      await delete_empty_user_data_last_price(
                        last_price_id,
                        symbol
                      );
                    }

                    // INCREMENT AMOUNT OF SELLER FROM LAST_PRICE
                    var seller_last_price_amount = parseFloat(
                      parseFloat(new_decimal_amount - bid_amount).toFixed(8)
                    );
                    await update_user_data_object_from_last_price_in_coin_table(
                      symbol,
                      seller_last_price_id,
                      seller_user_data_id,
                      seller_last_price_amount
                    );

                    new_decimal_amount = new_decimal_amount - bid_amount;
                  }
                }

                if (i === highest_bid.length - 1) {
                  console.log('::::: inside :::::');
                  // do your thing
                  for await (const highest_bid_element of highest_bid) {

                    var last_price_id = highest_bid_element.last_price._id;
    
                    await last_operation(
                      last_price_id,
                      symbol,
                      seller_last_price_id
                    );
                  }
    
                  await sell_last_operation(seller_last_price_id, symbol);
              }

              }

              var content = await object_data.get_all_coin_for_buy()

              io.emit("message", {content});

              res("Success");
            }
          } else {
            await session.abortTransaction();
            session.endSession();
            await session1.abortTransaction();
            session1.endSession();
            rej("Something went wrong");
          }
        } else {
          rej("Not enough fund");
        }
      } else {
        rej("No such coin exist");
      }
    } catch (error) {
      console.log({ error });
      await session.abortTransaction();
      session.endSession();
      await session1.abortTransaction();
      session1.endSession();
      rej(error);
    }
  });
};

const delete_empty_user_data_last_price = (seller_last_price_id, symbol) => {
  return new Promise(async (res, rej) => {
    try {
      var sell_check_user_data_array = await get_last_price_object_by_last_price_id_in_coin_table(
        seller_last_price_id
      );

      if (sell_check_user_data_array.length > 0) {
        if (sell_check_user_data_array[0].last_price.user_data.length == 0) {
          await delete_bid_data_of_symbol_by_last_price_id(
            symbol,
            seller_last_price_id
          );
          res("Success");
        } else {
          res("Success");
        }
      } else {
        res("Success");
      }
    } catch (error) {
      rej(error);
    }
  });
};

const get_lowest_or_less_than_and_equal_sell_bid = (
  symbol,
  pair_with,
  price
) => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        {
          $match: {
            $and: [
              { status_of_coin: "active" },
              { symbol: symbol.toUpperCase() },
              { "last_price.side": "SELL" },
              { "last_price.pair_with": pair_with.toUpperCase() },
              {
                "last_price.price": { $lte: price },
              },
            ],
          },
        },
        // Sort in ascending order
        {
          $sort: {
            "last_price.price": 1,
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

object_data.sell = (user_id, symbol, price, amount, pair_with, io) => {
  return new Promise(async (res, rej) => {
    const session = await Users.startSession();

    session.startTransaction();

    const session1 = await Coins.startSession();

    session1.startTransaction();

    const opts = { session };

    const opts1 = { session1 };

    try {
      var symbol_coin_id;

      // GET COIN BY ITS SYMBOL FROM COIN TABLE
      var symbol_data = await get_coin_by_symbol(symbol);

      if (symbol_data.length > 0) {
        symbol_coin_id = symbol_data[0]._id;

        // GET USER'S COIN BALANCE
        var balance_data = await get_user_balance_from_register_table(
          user_id,
          symbol
        );

        // BALANCE OF USER
        var simple_balance =
          balance_data.length == 0
            ? 0
            : parseFloat(
                balance_data[0].balance_data.available_balance_of_coin
              );

        var balance = parseFloat(parseFloat(simple_balance).toFixed(8));

        var decimal_price = parseFloat(parseFloat(price).toFixed(8));

        var decimal_amount = parseFloat(parseFloat(amount).toFixed(8));

        var decimal_total = parseFloat(parseFloat(price * amount).toFixed(8));

        console.log({ balance, decimal_total });

        if (decimal_amount <= balance) {
          // FETCH DATA WHICH MATCH WITH SYMBOL, PRICE, SIDE = SELL AND PAIR_WITH IN COIN TABLE
          var coin_data = await get_coin_of_sell_in_coin_table(
            symbol,
            price,
            "SELL",
            pair_with
          );

          var updated_data, open_order;

          // IF
          // DATA EXIST SO UPDATE AMOUNT AND TOTAL WITH NEW OBJECT IN USER_DATA IN COIN TABLE
          // ELSE
          // PUSH NEW OBJECT IN LAST_PRICE WITH NEW OBJECT IN USER_DATA IN COIN TABLE
          if (coin_data.length > 0) {
            // UPDATE AMOUNT AND TOTAL WITH NEW OBJECT IN USER_DATA IN COIN TABLE
            var table_amount, table_total, new_amount, new_total;

            table_amount = coin_data[0].last_price.amount;

            table_total = coin_data[0].last_price.total;

            new_amount = amount + table_amount;

            var add_data = price * amount;

            var demo_total = add_data + table_total;

            new_total = parseFloat(parseFloat(demo_total).toFixed(8));

            var user_data = {
              user_id: ObjectId(user_id),
              amount: parseFloat(parseFloat(amount).toFixed(8)),
            };

            updated_data = await update_last_price_and_user_data(
              symbol,
              decimal_price,
              "SELL",
              pair_with,
              new_amount,
              new_total,
              user_data,
              opts1
            );

            // updated_data.nModified > 0

            // GET USER_DATA ARRAY INSIDE LAST_PRICE ARRAY IN DESCENDING ORDER LIMIT 1
            var sorted_data = await get_user_data_in_last_price_in_coin_table_in_descending(
              symbol,
              price,
              "SELL",
              pair_with
            );
          } else {
            // PUSH NEW OBJECT IN LAST_PRICE WITH NEW OBJECT IN USER_DATA IN COIN TABLE
            var last_price = {
              price: parseFloat(parseFloat(price).toFixed(8)),
              amount: parseFloat(parseFloat(amount).toFixed(8)),
              total: decimal_total,
              pair_with: pair_with.toUpperCase(),
              side: "SELL",
              change_in_percentage: 0,
              user_data: {
                user_id: ObjectId(user_id),
                amount: parseFloat(parseFloat(amount).toFixed(8)),
              },
            };

            updated_data = await push_last_price_and_user_data(
              symbol,
              last_price,
              opts1
            );

            // updated_data.nModified > 0
          }

          // GET USER_DATA ARRAY INSIDE LAST_PRICE ARRAY IN DESCENDING ORDER LIMIT 1
          var sorted_data = await get_user_data_in_last_price_in_coin_table_in_descending(
            symbol,
            price,
            "SELL",
            pair_with
          );

          var currentdate = await current_date();

          var open_orders_data = {
            date: currentdate,
            user_order_id: sorted_data[0].last_price.user_data._id,
            pair_from: symbol.toUpperCase(),
            pair_to: pair_with.toUpperCase(),
            side: "SELL",
            price: parseFloat(parseFloat(price).toFixed(8)),
            amount: parseFloat(parseFloat(amount).toFixed(8)),
            total: decimal_total,
            status: "pending",
          };

          // PUSH OBJECT IN OPENS_ORDER_DATA OF USER IN REGISTER TABLE
          open_order = await push_object_in_open_orders_data_in_register_table(
            user_id,
            open_orders_data,
            opts
          );

          if (updated_data.nModified > 0 && open_order.nModified > 0) {
            await session.commitTransaction();
            session.endSession();
            await session1.commitTransaction();
            session1.endSession();

            // GET BUY BID WHICH IS EQUAL TO BIDDED PRICE OR GREATER THAN BIDDED PRICE
            var highest_bid = await get_highest_or_greater_than_and_equal_buy_bid(
              symbol,
              pair_with,
              decimal_price
            );

            var seller_last_price_id = sorted_data[0].last_price._id;

            var seller_user_data_id = sorted_data[0].last_price.user_data._id;

            console.log({ length: highest_bid.length });

            if (highest_bid.length == 0) {

              var content = await object_data.get_all_coin_for_sell()

              io.emit("message", {content});

              res("Success");
            } else {
              var new_decimal_amount = decimal_amount;

              for await(const [i, highest_bid_element] of highest_bid.entries()) {

                if (new_decimal_amount == 0 || new_decimal_amount < 0) break;

                var last_price_id = highest_bid_element.last_price._id;

                bottom_last_price_id = last_price_id;
                var bid_amount = 0;

                // ADD ALL AMOUNTS WHICH ARE IN LAST_PRICE USER_DATA IN COIN TABLE
                await Promise.all(
                  highest_bid_element.last_price.user_data.map(
                    (data) => (bid_amount = bid_amount + data.amount)
                  )
                );

                console.log({ bid_amount });

                // GET SORTED USER_DATA IN COIN TABLE, STORE IN ARRAY AND THEN DELETE IT FROM DATABASE
                var sorted_user_data = await get_sorted_user_data_in_last_price_in_coin_table_for_by_last_price_id(
                  last_price_id,
                  symbol,
                  pair_with
                );

                if (bid_amount == new_decimal_amount) {

                  for await(const element of sorted_user_data) {
                    // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                    var uid = element.last_price.user_data.user_id;

                    var user_data_id = element.last_price.user_data._id;

                    var user_data_who_filling_the_bid = {
                      bidder_id: ObjectId(user_id),
                      amount: element.last_price.user_data.amount,
                    };

                    await update_open_orders_data_pending_to_confirmed(
                      uid,
                      user_data_id,
                      user_data_who_filling_the_bid
                    );

                    // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                    var user_data_who_filling_the_bid1 = {
                      bidder_id: ObjectId(element.last_price.user_data.user_id),
                      amount: element.last_price.user_data.amount,
                    };

                    await update_open_orders_data_pending_to_confirmed(
                      user_id,
                      seller_user_data_id,
                      user_data_who_filling_the_bid1
                    );

                    // DECREEMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                    var decrement_amount = parseFloat(
                      parseFloat(
                        element.last_price.user_data.amount * price
                      ).toFixed(8)
                    );

                    await update_balance_of_coin_of_user(
                      uid,
                      pair_with,
                      -decrement_amount
                    );

                    // INCREEMENT SYMBOL BALANCE FROM BUYER USER TABLE
                    var increment_amount = element.last_price.user_data.amount;

                    await update_balance_of_coin_of_user(
                      uid,
                      symbol,
                      increment_amount
                    );

                    // DECREEMENT SYMBOL BALANCE FROM SELLER USER TABLE
                    var decrement_amount = element.last_price.user_data.amount;

                    await update_balance_of_coin_of_user(
                      user_id,
                      symbol,
                      -decrement_amount
                    );

                    // INCREEMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                    var increment_amount = parseFloat(
                      parseFloat(
                        element.last_price.user_data.amount * price
                      ).toFixed(8)
                    );

                    await update_balance_of_coin_of_user(
                      user_id,
                      pair_with,
                      increment_amount
                    );
                  }

                  var buyer_last_price_id = sorted_user_data[0].last_price._id;

                  // DELETE LAST_PRICE BID FOR BUY BY LAST_PRICE_ID
                  await delete_bid_data_of_symbol_by_last_price_id(
                    symbol,
                    buyer_last_price_id
                  );

                  // DELETE LAST_PRICE BID FOR SELL BY LAST_PRICE_ID
                  await delete_bid_data_of_symbol_by_last_price_id(
                    symbol,
                    seller_last_price_id
                  );

                  new_decimal_amount = 0;
                } else {
                  // AMOUNT IS LESS THAN
                  if (bid_amount > new_decimal_amount) {
                    console.log(
                      ":: BID AMOUNT IS GREATER THAN DECIMAL AMOUNT ::"
                    );

                    // 20 > 10  10 is bidded amount
                    var edit = new_decimal_amount;

                    for await(const element of sorted_user_data) {

                      var uid = element.last_price.user_data.user_id;

                      var last_price_id = element.last_price._id;

                      var user_data_id = element.last_price.user_data._id;

                      var buyer_amount = element.last_price.user_data.amount;

                      if (edit == 0 || edit < 0) break;

                      if (buyer_amount == edit) {
                        console.log(":: equal to ::");
                        // 2 == 2
                        // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                        var user_data_who_filling_the_bid = {
                          bidder_id: ObjectId(user_id),
                          amount: element.last_price.user_data.amount,
                        };

                        await update_open_orders_data_pending_to_confirmed(
                          uid,
                          user_data_id,
                          user_data_who_filling_the_bid
                        );

                        // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                        var user_data_who_filling_the_bid1 = {
                          bidder_id: ObjectId(
                            element.last_price.user_data.user_id
                          ),
                          amount: element.last_price.user_data.amount,
                        };

                        await update_open_orders_data_pending_to_confirmed(
                          user_id,
                          seller_user_data_id,
                          user_data_who_filling_the_bid1
                        );

                        // DECREEMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                        var decrement_amount = parseFloat(
                          parseFloat(
                            element.last_price.user_data.amount * price
                          ).toFixed(8)
                        );

                        await update_balance_of_coin_of_user(
                          uid,
                          pair_with,
                          -decrement_amount
                        );

                        // INCREEMENT SYMBOL BALANCE FROM BUYER USER TABLE
                        var increment_amount =
                          element.last_price.user_data.amount;

                        await update_balance_of_coin_of_user(
                          uid,
                          symbol,
                          increment_amount
                        );

                        // DECREEMENT SYMBOL BALANCE FROM SELLER USER TABLE
                        var decrement_amount =
                          element.last_price.user_data.amount;

                        await update_balance_of_coin_of_user(
                          user_id,
                          symbol,
                          -decrement_amount
                        );

                        // INCREEMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                        var increment_amount = parseFloat(
                          parseFloat(
                            element.last_price.user_data.amount * price
                          ).toFixed(8)
                        );

                        await update_balance_of_coin_of_user(
                          user_id,
                          pair_with,
                          increment_amount
                        );

                        // DELETE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                        await delete_user_data_object_from_last_price_in_coin_table(
                          symbol,
                          last_price_id,
                          user_data_id
                        );

                        // DELETE LAST_PRICE BID FOR SELL BY LAST_PRICE_ID
                        await delete_bid_data_of_symbol_by_last_price_id(
                          symbol,
                          seller_last_price_id
                        );
                      } else {
                        if (buyer_amount < edit) {
                          console.log(":: amount less than ::");
                          // 10 < 20
                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid = {
                            bidder_id: ObjectId(user_id),
                            amount: element.last_price.user_data.amount,
                          };

                          await update_open_orders_data_pending_to_confirmed(
                            uid,
                            user_data_id,
                            user_data_who_filling_the_bid
                          );

                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid1 = {
                            bidder_id: ObjectId(
                              element.last_price.user_data.user_id
                            ),
                            amount: element.last_price.user_data.amount,
                          };

                          await update_open_orders_data_pending_to_confirmed(
                            user_id,
                            seller_user_data_id,
                            user_data_who_filling_the_bid1
                          );

                          // DECREEMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount * price
                            ).toFixed(8)
                          );

                          await update_balance_of_coin_of_user(
                            uid,
                            pair_with,
                            -decrement_amount
                          );

                          // INCREEMENT SYMBOL BALANCE FROM BUYER USER TABLE
                          var increment_amount =
                            element.last_price.user_data.amount;

                          await update_balance_of_coin_of_user(
                            uid,
                            symbol,
                            increment_amount
                          );

                          // DECREEMENT SYMBOL BALANCE FROM SELLER USER TABLE
                          var decrement_amount =
                            element.last_price.user_data.amount;

                          await update_balance_of_coin_of_user(
                            user_id,
                            symbol,
                            -decrement_amount
                          );

                          // INCREEMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount * price
                            ).toFixed(8)
                          );

                          await update_balance_of_coin_of_user(
                            user_id,
                            pair_with,
                            increment_amount
                          );

                          // DELETE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                          await delete_user_data_object_from_last_price_in_coin_table(
                            symbol,
                            last_price_id,
                            user_data_id
                          );

                          edit = edit - element.last_price.user_data.amount;
                        } else {
                          console.log(":: amount greater ::");
                          // BUYER_AMOUNT > EDIT
                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          // AND ALSO UPDATE AMOUNT
                          var update_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount - edit
                            ).toFixed(8)
                          );

                          var user_data_who_filling_the_bid = {
                            bidder_id: ObjectId(user_id),
                            amount: parseFloat(parseFloat(edit).toFixed(8)),
                          };

                          await update_open_orders_data_amount(
                            uid,
                            user_data_id,
                            update_amount,
                            user_data_who_filling_the_bid
                          );

                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid1 = {
                            bidder_id: ObjectId(
                              element.last_price.user_data.user_id
                            ),
                            amount: parseFloat(parseFloat(edit).toFixed(8)),
                          };

                          await update_open_orders_data_pending_to_confirmed(
                            user_id,
                            seller_user_data_id,
                            user_data_who_filling_the_bid1
                          );

                          // DECREEMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(edit * price).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            uid,
                            pair_with,
                            -decrement_amount
                          );

                          // INCREEMENT SYMBOL BALANCE FROM BUYER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(edit).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            uid,
                            symbol,
                            increment_amount
                          );

                          // DECREEMENT SYMBOL BALANCE FROM SELLER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(edit).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            user_id,
                            symbol,
                            -decrement_amount
                          );

                          // INCREEMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(edit * price).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            user_id,
                            pair_with,
                            increment_amount
                          );

                          // UPDATE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                          await update_user_data_object_from_last_price_in_coin_table(
                            symbol,
                            last_price_id,
                            user_data_id,
                            update_amount
                          );

                          edit = 0;
                        }
                      }
                    }

                    // DELETE OBJECT OF SELLER BID FROM LAST_PRICE
                    await delete_bid_data_of_symbol_by_last_price_id(
                      symbol,
                      seller_last_price_id
                    );

                    new_decimal_amount = 0;
                  } else {
                    console.log(":: BID AMOUNT LESS THAN DECIMAL AMOUNT ::");

                    var edit = new_decimal_amount;

                    for (const element of sorted_user_data) {
                      var uid = element.last_price.user_data.user_id;
                      var last_price_id = element.last_price._id;
                      var user_data_id = element.last_price.user_data._id;
                      var buyer_amount = element.last_price.user_data.amount;

                      if (edit == 0 || edit < 0) break;

                      if (buyer_amount == edit) {
                        console.log(":: equal to ::");
                        // 2 == 2
                        // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                        var user_data_who_filling_the_bid = {
                          bidder_id: ObjectId(user_id),
                          amount: element.last_price.user_data.amount,
                        };
                        await update_open_orders_data_pending_to_confirmed(
                          uid,
                          user_data_id,
                          user_data_who_filling_the_bid
                        );

                        // UPDATE OPEN_ORDER_DATA AMOUNT OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                        var user_data_who_filling_the_bid1 = {
                          bidder_id: ObjectId(
                            element.last_price.user_data.user_id
                          ),
                          amount: element.last_price.user_data.amount,
                        };

                        var seller_database_amount = await get_user_open_order_data_amount(
                          user_id,
                          seller_user_data_id
                        );

                        var seller_amount = parseFloat(
                          parseFloat(
                            seller_database_amount[0].open_orders_data.amount -
                              element.last_price.user_data.amount
                          ).toFixed(8)
                        );

                        var seller_total = parseFloat(
                          parseFloat(seller_amount * price).toFixed(8)
                        );

                        await update_open_orders_data_amount(
                          user_id,
                          seller_user_data_id,
                          seller_amount,
                          user_data_who_filling_the_bid1
                        );

                        // DECREEMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                        var decrement_amount = parseFloat(
                          parseFloat(
                            element.last_price.user_data.amount * price
                          ).toFixed(8)
                        );
                        await update_balance_of_coin_of_user(
                          uid,
                          pair_with,
                          -decrement_amount
                        );

                        // INCREEMENT SYMBOL BALANCE FROM BUYER USER TABLE
                        var increment_amount =
                          element.last_price.user_data.amount;
                        await update_balance_of_coin_of_user(
                          uid,
                          symbol,
                          increment_amount
                        );

                        // DECREEMENT SYMBOL BALANCE FROM SELLER USER TABLE
                        var decrement_amount =
                          element.last_price.user_data.amount;
                        await update_balance_of_coin_of_user(
                          user_id,
                          symbol,
                          -decrement_amount
                        );

                        // INCREEMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                        var increment_amount = parseFloat(
                          parseFloat(
                            element.last_price.user_data.amount * price
                          ).toFixed(8)
                        );
                        await update_balance_of_coin_of_user(
                          user_id,
                          pair_with,
                          increment_amount
                        );

                        // DELETE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                        await delete_user_data_object_from_last_price_in_coin_table(
                          symbol,
                          last_price_id,
                          user_data_id
                        );

                        // DELETE LAST_PRICE BID FOR SELL BY LAST_PRICE_ID
                        await delete_bid_data_of_symbol_by_last_price_id(
                          symbol,
                          seller_last_price_id
                        );

                        edit = 0;
                      } else {
                        if (buyer_amount < edit) {
                          console.log(":: amount less than ::");
                          // 10 < 20
                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid = {
                            bidder_id: ObjectId(user_id),
                            amount: element.last_price.user_data.amount,
                          };
                          await update_open_orders_data_pending_to_confirmed(
                            uid,
                            user_data_id,
                            user_data_who_filling_the_bid
                          );

                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid1 = {
                            bidder_id: ObjectId(
                              element.last_price.user_data.user_id
                            ),
                            amount: element.last_price.user_data.amount,
                          };

                          var seller_database_amount = await get_user_open_order_data_amount(
                            user_id,
                            seller_user_data_id
                          );

                          var seller_amount = parseFloat(
                            parseFloat(
                              seller_database_amount[0].open_orders_data
                                .amount - element.last_price.user_data.amount
                            ).toFixed(8)
                          );

                          var seller_total = parseFloat(
                            parseFloat(seller_amount * price).toFixed(8)
                          );

                          await update_open_orders_data_amount(
                            user_id,
                            seller_user_data_id,
                            seller_amount,
                            user_data_who_filling_the_bid1
                          );

                          // DECREEMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount * price
                            ).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            uid,
                            pair_with,
                            -decrement_amount
                          );

                          // INCREEMENT SYMBOL BALANCE FROM BUYER USER TABLE
                          var increment_amount =
                            element.last_price.user_data.amount;
                          await update_balance_of_coin_of_user(
                            uid,
                            symbol,
                            increment_amount
                          );

                          // DECREEMENT SYMBOL BALANCE FROM SELLER USER TABLE
                          var decrement_amount =
                            element.last_price.user_data.amount;
                          await update_balance_of_coin_of_user(
                            user_id,
                            symbol,
                            -decrement_amount
                          );

                          // INCREEMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount * price
                            ).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            user_id,
                            pair_with,
                            increment_amount
                          );

                          // DELETE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                          await delete_user_data_object_from_last_price_in_coin_table(
                            symbol,
                            last_price_id,
                            user_data_id
                          );

                          edit = edit - element.last_price.user_data.amount;
                        } else {
                          console.log(":: amount greater ::");
                          // BUYER_AMOUNT > EDIT
                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF BUYER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          // AND ALSO UPDATE AMOUNT
                          var update_amount = parseFloat(
                            parseFloat(
                              element.last_price.user_data.amount - edit
                            ).toFixed(8)
                          );
                          var user_data_who_filling_the_bid = {
                            bidder_id: ObjectId(user_id),
                            amount: parseFloat(parseFloat(edit).toFixed(8)),
                          };
                          await update_open_orders_data_amount(
                            uid,
                            user_data_id,
                            update_amount,
                            user_data_who_filling_the_bid
                          );

                          // UPDATE OPEN_ORDER_DATA FROM PENDING TO CONFIRM OF SELLER AND PUSH USER_DATA_WHO_FILLING_ORDER
                          var user_data_who_filling_the_bid1 = {
                            bidder_id: ObjectId(
                              element.last_price.user_data.user_id
                            ),
                            amount: parseFloat(parseFloat(edit).toFixed(8)),
                          };

                          var seller_database_amount = await get_user_open_order_data_amount(
                            user_id,
                            seller_user_data_id
                          );

                          var seller_amount = parseFloat(
                            parseFloat(
                              seller_database_amount[0].open_orders_data
                                .amount - element.last_price.user_data.amount
                            ).toFixed(8)
                          );

                          var seller_total = parseFloat(
                            parseFloat(seller_amount * price).toFixed(8)
                          );

                          await update_open_orders_data_amount(
                            user_id,
                            seller_user_data_id,
                            seller_amount,
                            user_data_who_filling_the_bid1
                          );

                          // DECREEMENT PAIR_WITH BALANCE FROM BUYER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(edit * price).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            uid,
                            pair_with,
                            -decrement_amount
                          );

                          // INCREEMENT SYMBOL BALANCE FROM BUYER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(edit).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            uid,
                            symbol,
                            increment_amount
                          );

                          // DECREEMENT SYMBOL BALANCE FROM SELLER USER TABLE
                          var decrement_amount = parseFloat(
                            parseFloat(edit).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            user_id,
                            symbol,
                            -decrement_amount
                          );

                          // INCREEMENT PAIR_WITH BALANCE FROM SELLER USER TABLE
                          var increment_amount = parseFloat(
                            parseFloat(edit * price).toFixed(8)
                          );
                          await update_balance_of_coin_of_user(
                            user_id,
                            pair_with,
                            increment_amount
                          );

                          // UPDATE USER_DATA OBJECT FROM BUY BID FROM COIN TABLE BY USING USER_DATA_ID
                          await update_user_data_object_from_last_price_in_coin_table(
                            symbol,
                            last_price_id,
                            user_data_id,
                            update_amount
                          );

                          edit = edit - element.last_price.user_data.amount;
                        }
                      }
                    }

                    // DECREEMENT AMOUNT OF SELLER FROM LAST_PRICE
                    var seller_last_price_amount = parseFloat(
                      parseFloat(new_decimal_amount - bid_amount).toFixed(8)
                    );
                    await update_user_data_object_from_last_price_in_coin_table(
                      symbol,
                      seller_last_price_id,
                      seller_user_data_id,
                      seller_last_price_amount
                    );

                    new_decimal_amount = new_decimal_amount - bid_amount;
                  }
                }

                if (i === highest_bid.length - 1) {
                  // do your thing
                  for await (const highest_bid_element of highest_bid) {

                    var last_price_id = highest_bid_element.last_price._id;
    
                    await last_operation(
                      last_price_id,
                      symbol,
                      seller_last_price_id
                    );
                  }
    
                  await sell_last_operation(seller_last_price_id, symbol);
              }

              }

              var content = await object_data.get_all_coin_for_sell()

              io.emit("message", {content});

              res("Success");
            }
          } else {
            await session.abortTransaction();
            session.endSession();
            await session1.abortTransaction();
            session1.endSession();
            rej("Something went wrong");
          }
        } else {
          rej("Not enough fund");
        }
      } else {
        rej("No such coin exist");
      }
    } catch (error) {
      console.log({ error });
      await session.abortTransaction();
      session.endSession();
      await session1.abortTransaction();
      session1.endSession();
      rej(error);
    }
  });
};

const last_operation = (bottom_last_price_id, symbol, seller_last_price_id) => {
  return new Promise(async (res, rej) => {
    try {
      // FOR BUY BID
      // CHECK USER_DATA IS EMPTY OR NOT IN LAST_PRICE IN COIN
      // IF EMPTY SO DELETE LAST_PRICE OBJECT
      var check_user_data_array = await get_last_price_object_by_last_price_id_in_coin_table(
        bottom_last_price_id
      );

      if (check_user_data_array.length > 0) {
        if (check_user_data_array[0].last_price.user_data.length == 0) {
          var deleted_data = await delete_bid_data_of_symbol_by_last_price_id(
            symbol,
            bottom_last_price_id
          );
          console.log({deleted_data});
          res("Success");
        } else {
          // ADD ALL AMOUNT OF USER_DATA AND THEN UPDATE LAST_PRICE AMOUNT AND TOTAL
          var user_data_amount = 0;

          if (check_user_data_array.length > 0) {

            for await(const data of check_user_data_array[0].last_price.user_data) {
              user_data_amount = user_data_amount + data.amount
            }

            console.log({user_data_amount});

            var last_price_price = check_user_data_array[0].last_price
                .price,
              last_price_total = parseFloat(parseFloat(last_price_price * user_data_amount).toFixed(8))

            await update_amount_and_total_in_last_price(
              symbol,
              bottom_last_price_id,
              user_data_amount,
              last_price_total
            );
          }

          res("Success");
        }
      } else {
        res("Success");
      }
    } catch (error) {
      rej(error);
    }
  });
};

const sell_last_operation = (seller_last_price_id, symbol) => {
  return new Promise(async (res, rej) => {
    try {
      // FOR SELL BID
      // CHECK USER_DATA IS EMPTY OR NOT IN LAST_PRICE IN COIN
      // IF EMPTY SO DELETE LAST_PRICE OBJECT
      var sell_check_user_data_array = await get_last_price_object_by_last_price_id_in_coin_table(
        seller_last_price_id
      );

      if (sell_check_user_data_array.length > 0) {
        if (sell_check_user_data_array[0].last_price.user_data.length == 0) {
          await delete_bid_data_of_symbol_by_last_price_id(
            symbol,
            seller_last_price_id
          );
          res("Success");
        } else {
          // ADD ALL AMOUNT OF USER_DATA AND THEN UPDATE LAST_PRICE AMOUNT AND TOTAL
          var sell_user_data_amount = 0;

          if (sell_check_user_data_array.length) {

            for await(const data of sell_check_user_data_array[0].last_price.user_data) {
              sell_user_data_amount = sell_user_data_amount + data.amount
            }

            console.log({sell_user_data_amount});

            var sell_last_price_price = sell_check_user_data_array[0]
                .last_price.price,
              sell_last_price_total = parseFloat(parseFloat(sell_last_price_price * sell_user_data_amount).toFixed(8))

            await update_amount_and_total_in_last_price(
              symbol,
              seller_last_price_id,
              sell_user_data_amount,
              sell_last_price_total
            );
          }

          res("Success");
        }
      } else {
        res("Success");
      }
    } catch (error) {
      rej(error);
    }
  });
};

const update_amount_and_total_in_last_price = (
  symbol,
  last_price_id,
  amount,
  total
) => {
  return new Promise((res, rej) => {
    Coins.updateOne(
      {
        symbol: symbol.toUpperCase(),
        "last_price._id": ObjectId(last_price_id),
      },
      {
        $set: {
          "last_price.$.amount": amount,
          "last_price.$.total": total,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const get_highest_or_greater_than_and_equal_buy_bid = (
  symbol,
  pair_with,
  price
) => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        {
          $match: {
            $and: [
              { status_of_coin: "active" },
              { symbol: symbol.toUpperCase() },
              { "last_price.side": "BUY" },
              { "last_price.pair_with": pair_with.toUpperCase() },
              {
                "last_price.price": { $gte: price },
              },
            ],
          },
        },
        // Sort in descending order
        {
          $sort: {
            "last_price.price": -1,
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

const get_user_open_order_data_amount = (user_id, user_order_id) => {
  return new Promise((res, rej) => {
    Users.aggregate(
      [
        { $unwind: "$open_orders_data" },
        {
          $match: {
            $and: [
              { _id: ObjectId(user_id) },
              { "open_orders_data.user_order_id": ObjectId(user_order_id) },
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

const get_last_price_object_by_last_price_id_in_coin_table = (
  last_price_id
) => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        {$match: {
          $and: [
            { "last_price._id": ObjectId(last_price_id) },
          ],
        }}
      ], 
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    )
      })
};

const update_user_data_object_from_last_price_in_coin_table = (
  symbol,
  last_price_id,
  user_data_id,
  amount
) => {
  return new Promise((res, rej) => {
    Coins.updateOne(
      {
        symbol: symbol.toUpperCase(),
      },
      {
        $set: { ["last_price.$[i].user_data.$[j].amount"]: amount },
      },
      {
        arrayFilters: [
          { "i._id": ObjectId(last_price_id) },
          { "j._id": ObjectId(user_data_id) },
        ],
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const update_open_orders_data_amount = (
  user_id,
  user_order_id,
  amount,
  user_data_who_filling_the_bid
) => {
  return new Promise((res, rej) => {
    Users.updateOne(
      {
        _id: ObjectId(user_id),
        "open_orders_data.user_order_id": ObjectId(user_order_id),
      },
      {
        $set: {
          "open_orders_data.$.amount": amount,
        },
        $push: {
          "open_orders_data.$.user_data_who_filling_the_bid": user_data_who_filling_the_bid,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const delete_user_data_object_from_last_price_in_coin_table = (
  symbol,
  last_price_id,
  user_data_id
) => {
  return new Promise((res, rej) => {
    Coins.updateOne(
      {
        symbol: symbol.toUpperCase(),
        "last_price._id": ObjectId(last_price_id),
      },
      {
        $pull: { "last_price.$.user_data": { _id: ObjectId(user_data_id) } },
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const delete_bid_data_of_symbol_by_last_price_id = (symbol, last_price_id) => {
  return new Promise((res, rej) => {
    Coins.updateOne(
      { symbol: symbol.toUpperCase() },
      {
        $pull: { last_price: { _id: ObjectId(last_price_id) } },
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const update_balance_of_coin_of_user = (user_id, symbol, amount) => {
  return new Promise((res, rej) => {
    Users.updateOne(
      { _id: ObjectId(user_id), "balance_data.symbol": symbol.toUpperCase() },
      {
        $inc: {
          "balance_data.$.available_balance_of_coin": amount,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const update_open_orders_data_pending_to_confirmed = (
  user_id,
  user_order_id,
  user_data_who_filling_the_bid
) => {
  return new Promise((res, rej) => {
    Users.updateOne(
      {
        _id: ObjectId(user_id),
        "open_orders_data.user_order_id": ObjectId(user_order_id),
      },
      {
        $set: {
          "open_orders_data.$.status": "confirmed",
        },
        $push: {
          "open_orders_data.$.user_data_who_filling_the_bid": user_data_who_filling_the_bid,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const get_sorted_user_data_in_last_price_in_coin_table_for_by_last_price_id = (
  last_price_id,
  symbol,
  pair_with
) => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        { $unwind: "$last_price.user_data" },
        {
          $match: {
            $and: [
              { status_of_coin: "active" },
              { symbol: symbol.toUpperCase() },
              { "last_price.pair_with": pair_with.toUpperCase() },
              { "last_price._id": ObjectId(last_price_id) },
            ],
          },
        },
        // Sort in ascending order
        {
          $sort: {
            "last_price.user_data._id": 1,
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

const push_object_in_open_orders_data_in_register_table = (
  user_id,
  open_orders_data,
  opts
) => {
  return new Promise((res, rej) => {
    Users.updateOne(
      { _id: ObjectId(user_id) },
      {
        $push: {
          open_orders_data,
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

const get_user_data_in_last_price_in_coin_table_in_descending = (
  symbol,
  price,
  side,
  pair_with
) => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        { $unwind: "$last_price.user_data" },
        {
          $match: {
            $and: [
              { symbol: symbol.toUpperCase() },
              { status_of_coin: "active" },
              { "last_price.price": price },
              { "last_price.pair_with": pair_with.toUpperCase() },
              { "last_price.side": side },
            ],
          },
        },
        { $sort: { "last_price.user_data._id": -1 } },
        { $limit: 1 },
      ],
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const push_last_price_and_user_data = (symbol, last_price) => {
  return new Promise((res, rej) => {
    Coins.updateOne(
      { symbol: symbol.toUpperCase() },
      {
        $push: {
          last_price,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const update_last_price_and_user_data = (
  symbol,
  price,
  side,
  pair_with,
  amount,
  total,
  user_data,
  opts
) => {
  return new Promise((res, rej) => {
    Coins.updateOne(
      {
        symbol: symbol.toUpperCase(),
        status_of_coin: "active",
        "last_price.price": price,
        "last_price.pair_with": pair_with.toUpperCase(),
        "last_price.side": side,
      },
      {
        $set: {
          "last_price.$.amount": amount,
          "last_price.$.total": total,
          "last_price.$.change_in_percentage": 0,
        },
        $push: {
          "last_price.$.user_data": user_data,
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

const get_coin_of_sell_in_coin_table = (symbol, price, side, pair_with) => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        {
          $match: {
            $and: [
              { symbol: symbol.toUpperCase() },
              { status_of_coin: "active" },
              { "last_price.price": price },
              { "last_price.pair_with": pair_with.toUpperCase() },
              { "last_price.side": side },
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

const get_user_balance_from_register_table = async (user_id, symbol) => {
  return new Promise((res, rej) => {
    Users.aggregate(
      [
        { $unwind: "$balance_data" },
        {
          $match: {
            $and: [
              { _id: ObjectId(user_id) },
              { "balance_data.symbol": symbol.toUpperCase() },
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

// CONVERT EXPONENTIAL DECIMAL TO DECIMAL
const convertExponentialToDecimal = (exponentialNumber) => {
  // sanity check - is it exponential number
  const str = exponentialNumber.toString();
  if (str.indexOf("e") !== -1) {
    const exponent = parseInt(str.split("-")[1], 10);
    // Unfortunately I can not return 1e-8 as 0.00000001, because even if I call parseFloat() on it,
    // it will still return the exponential representation
    // So I have to use .toFixed()
    const result = exponentialNumber.toFixed(exponent);
    return result;
  } else {
    return exponentialNumber;
  }
};

const find_wallet_by_user_id = async (user_id, wallet_coin_type) => {
  return new Promise((res, rej) => {
    wallet.aggregate(
      [
        { $unwind: "$crypto_details" },
        {
          $match: {
            $and: [
              { user_id: { $eq: ObjectId(user_id) } },
              {
                "crypto_details.symbol": {
                  $eq: wallet_coin_type.toUpperCase(),
                },
              },
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

const get_balance_of_trc20_token = async (contract_address, user_address) => {
  var balance = await get_balance_of_trc20(contract_address, user_address);
  return balance;
};

object_data.search_coin = (symbol, pair_with) => {
  return new Promise((res, rej) => {
    Coins.find(
      {
        $and: [
          {
            $or: [
              { name: { $regex: symbol, $options: "i" } },
              { symbol: { $regex: symbol, $options: "i" } },
            ],
          },
          {
            status_of_coin: {
              $eq: "active",
            },
          },
          {
            symbol: {
              $ne: pair_with.toUpperCase(),
            },
          },
        ],
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

object_data.get_all_coin_price = () => {
  return new Promise((res, rej) => {
    Coins.find(
      { status_of_coin: "active" },
      { last_price: { $slice: -1 } },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

object_data.get_all_coin_for_sell = async () => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        {
          $match: {
            $and: [
              { status_of_coin: { $eq: "active" } },
              {
                "last_price.side": {
                  $eq: "SELL",
                },
              },
            ],
          },
        },
        // Sort in ascending order
        {
          $sort: {
            "last_price.price": 1,
          },
        },
        //Limit for 5
        { $limit: 5 },
      ],
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

object_data.get_all_coin_for_buy = async () => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        {
          $match: {
            $and: [
              { status_of_coin: { $eq: "active" } },
              {
                "last_price.side": {
                  $eq: "BUY",
                },
              },
            ],
          },
        },
        // Sort in ascending order
        {
          $sort: {
            "last_price.price": -1,
          },
        },
        //Limit for 5
        { $limit: 5 },
      ],
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

object_data.get_price_of_coin = (symbol) => {
  return new Promise(async (res, rej) => {
    try {
      var coin_data = await get_coin_by_symbol(symbol);
      res(coin_data);
    } catch (error) {
      rej(error);
    }
  });
};

object_data.get_balance_of_both_paired_coin = (user_id, symbol, pair_with) => {
  return new Promise(async (res, rej) => {
    try {
      var symbol_data = await get_coin_data(symbol);
      var pair_with_data = await get_coin_data(pair_with);
      var symbol_balance_data = await get_balance(user_id, symbol);
      var pair_with_balance_data = await get_balance(user_id, pair_with);

      var balance_data1 = {
        coin_id: ObjectId(symbol_data[0]._id),
        symbol: symbol.toUpperCase(),
        total_balance_of_coin: 0,
        available_balance_of_coin: 0,
        in_order: 0,
      };

      var balance_data2 = {
        coin_id: ObjectId(pair_with_data[0]._id),
        symbol: pair_with.toUpperCase(),
        total_balance_of_coin: 0,
        available_balance_of_coin: 0,
        in_order: 0,
      };

      var balance1 = 0,
        balance2 = 0;

      if (
        symbol_balance_data.length == 0 &&
        pair_with_balance_data.length == 0
      ) {
        // PUSH NEW OBJECT OF BOTH COIN IN REGISTER TABLE
        await push_coin_balance_in_register_table(user_id, balance_data1);
        await push_coin_balance_in_register_table(user_id, balance_data2);

        res({ balance1, balance2 });
      } else {
        if (symbol_balance_data.length == 0) {
          // PUSH NEW OBJECT OF FIRST COIN IN REGISTER TABLE
          await push_coin_balance_in_register_table(user_id, balance_data1);

          // GET BALANCE OF SECOND COIN FROM REGISTER TABLE
          balance2 =
            pair_with_balance_data[0].balance_data.available_balance_of_coin;

          res({ balance1, balance2 });
        } else {
          if (pair_with_balance_data.length == 0) {
            // PUSH NEW OBJECT OF SECOND COIN IN REGISTER TABLE
            await push_coin_balance_in_register_table(user_id, balance_data2);

            // GET BALANCE OF FIRST COIN FROM REGISTER TABLE
            balance1 =
              symbol_balance_data[0].balance_data.available_balance_of_coin;

            res({ balance1, balance2 });
          } else {
            // GET BALANCE OF FIRST COIN FROM REGISTER TABLE
            balance1 =
              symbol_balance_data[0].balance_data.available_balance_of_coin;
            // GET BALANCE OF SECOND COIN FROM REGISTER TABLE
            balance2 =
              pair_with_balance_data[0].balance_data.available_balance_of_coin;
            res({ balance1, balance2 });
          }
        }
      }
    } catch (error) {
      rej(error);
    }
  });
};

const push_coin_balance_in_register_table = (user_id, balance_data) => {
  return new Promise((res, rej) => {
    Users.updateOne(
      { _id: ObjectId(user_id) },
      {
        $push: {
          balance_data,
        },
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const get_coin_data = (symbol) => {
  return new Promise((res, rej) => {
    Coins.find({ symbol: symbol.toUpperCase() }, (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
};

const get_balance = (user_id, symbol) => {
  return new Promise((res, rej) => {
    Users.aggregate(
      [
        { $unwind: "$balance_data" },
        {
          $match: {
            $and: [
              { _id: ObjectId(user_id) },
              {
                "balance_data.symbol": symbol.toUpperCase(),
              },
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

object_data.get_available_balance_of_coin_and_paired_coin = (
  user_id,
  coin_symbol,
  pair_with
) => {
  return new Promise(async (res, rej) => {
    try {
      var first_coin, second_coin;

      // GET TOKEN DETAILS FROM COIN TABLE
      var symbol_data = await get_coin_by_symbol(coin_symbol),
        pair_data = await get_coin_by_symbol(pair_with);

      var token_type1 = symbol_data[0].token_type,
        token_type2 = pair_data[0].token_type;

      var wallet_coin_type1 =
        token_type1 == "trc20"
          ? "TRON"
          : token_type1 == "erc20"
          ? "ETH"
          : "BTC";

      var wallet_coin_type2 =
        token_type2 == "trc20"
          ? "TRON"
          : token_type2 == "erc20"
          ? "ETH"
          : "BTC";

      // GET COIN DETAILS OF USER FROM HIS/HER WALLET BY USING COIN TYPE
      var wallet_data1 = await get_coin_from_wallet_of_user(
        user_id,
        wallet_coin_type1
      );
      var wallet_data2 = await get_coin_from_wallet_of_user(
        user_id,
        wallet_coin_type2
      );

      if (wallet_data1.length == 0 && wallet_data2.length == 0) {
        first_coin = 0;
        second_coin = 0;
      } else {
        if (wallet_data1.length == 0 && wallet_data2.length > 0) {
          first_coin = 0;
          second_coin = await get_coin_balance(user_id, pair_with);
          res({ first_coin, second_coin });
        } else {
          if (wallet_data1.length > 0 && wallet_data2.length == 0) {
            second_coin = 0;
            first_coin = await get_coin_balance(user_id, coin_symbol);
            res({ first_coin, second_coin });
          } else {
            first_coin = await get_coin_balance(user_id, coin_symbol);
            second_coin = await get_coin_balance(user_id, pair_with);
            res({ first_coin, second_coin });
          }
        }
      }
    } catch (error) {
      console.log({ error });
      rej(error);
    }
  });
};

const get_coin_balance = async (user_id, coin_symbol) => {
  return new Promise(async (res, rej) => {
    try {
      var symbol_data = await get_coin_by_symbol(coin_symbol);
      var contract_address = symbol_data[0].contract_address;
      var token_type = symbol_data[0].token_type;
      var wallet_coin_type =
        token_type == "trc20" ? "TRON" : token_type == "erc20" ? "ETH" : "BTC";

      // GET DATA OF USER FROM WALLET
      var user_data = await find_wallet_by_user_id(user_id, wallet_coin_type);
      var user_address = user_data[0].crypto_details.address;
      console.log({ user_address });
      var balance = await get_balance_of_trc20_token(
        contract_address,
        user_address
      );
      console.log({ balance });
      res(balance);
    } catch (error) {
      rej(error);
    }
  });
};

const get_coin_from_wallet_of_user = (user_id, coin_symbol) => {
  return new Promise((res, rej) => {
    wallet.aggregate(
      [
        { $unwind: "$crypto_details" },
        {
          $match: {
            $and: [
              {
                user_id: {
                  $eq: ObjectId(user_id),
                },
              },
              {
                "crypto_details.symbol": {
                  $eq: coin_symbol.toUpperCase(),
                },
              },
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

object_data.get_all_pairs_for_coin = async () => {
  return new Promise((res, rej) => {
    console.log({ Pairs });
    res(Pairs);
  });
};

// ------------------ UTILITY FUNCTIONS -------------------------

const get_coin_by_symbol = (symbol) => {
  return new Promise((resolve, reject) => {
    Coins.find({ symbol: symbol.toUpperCase() }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

module.exports = object_data;