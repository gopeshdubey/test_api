var mongoose = require("mongoose");
var ObjectId = mongoose.Types.ObjectId;

const { get_balance_of_trc20, transfer_trc20 } = require("../Utils/trc20");
const { Pairs } = require("../Utils/pairs");
const Coins = require("../Model/coin");
const Users = require("../Model/register");
const wallet = require("../Model/wallet");

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

var object_data = {};

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

object_data.buy = (user_id, symbol, price, amount, pair_with) => {
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
              res("Success");
            } else {
              var new_decimal_amount = decimal_amount;

              // NEW CODE

              for await (const highest_bid_element of highest_bid) {
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

                await last_operation(
                  last_price_id,
                  symbol,
                  seller_last_price_id
                );
              }

              await sell_last_operation(seller_last_price_id, symbol);

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
        if (sell_check_user_data_array[0].last_price[0].user_data.length == 0) {
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

object_data.sell = (user_id, symbol, price, amount, pair_with) => {
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
              res("Success");
            } else {
              var new_decimal_amount = decimal_amount;

              for await(const highest_bid_element of highest_bid) {
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

                await last_operation(
                  last_price_id,
                  symbol,
                  seller_last_price_id
                );
              }

              await sell_last_operation(seller_last_price_id, symbol);

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
        if (check_user_data_array[0].last_price[0].user_data.length == 0) {
          var deleted_data = await delete_bid_data_of_symbol_by_last_price_id(
            symbol,
            bottom_last_price_id
          );
          res("Success");
        } else {
          // ADD ALL AMOUNT OF USER_DATA AND THEN UPDATE LAST_PRICE AMOUNT AND TOTAL
          var user_data_amount = 0;

          if (check_user_data_array.length > 0) {
            await Promise.all(
              check_user_data_array[0].last_price[0].user_data.map(
                (data) => (user_data_amount = user_data_amount + data.amount)
              )
            );
            var last_price_price = await check_user_data_array[0].last_price[0]
                .price,
              last_price_total = (await last_price_price) * user_data_amount;

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
        if (sell_check_user_data_array[0].last_price[0].user_data.length == 0) {
          await delete_bid_data_of_symbol_by_last_price_id(
            symbol,
            seller_last_price_id
          );
          res("Success");
        } else {
          // ADD ALL AMOUNT OF USER_DATA AND THEN UPDATE LAST_PRICE AMOUNT AND TOTAL
          var sell_user_data_amount = 0;

          if (sell_check_user_data_array.length) {
            await Promise.all(
              sell_check_user_data_array[0].last_price[0].user_data.map(
                (data) =>
                  (sell_user_data_amount = sell_user_data_amount + data.amount)
              )
            );
            var sell_last_price_price = await sell_check_user_data_array[0]
                .last_price[0].price,
              sell_last_price_total =
                (await sell_last_price_price) * sell_user_data_amount;

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
    Coins.find({ "last_price._id": ObjectId(last_price_id) }, (err, data) => {
      if (err) rej(err);
      else res(data);
    });
  });
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

const push_balance_data_of_user = (user_id, balance_data) => {
  return new Promise((res, rej) => {
    Users.updateOne(
      { _id: ObjectId(user_id) },
      {
        balance_data,
      },
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const check_coin_exist_in_registers_table = (user_id, symbol) => {
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

const update_balance_data_of_user = (user_id, balance, symbol) => {
  return new Promise((res, rej) => {
    Users.updateOne(
      { _id: ObjectId(user_id), "balance_data.symbol": symbol.toUpperCase() },
      {
        $set: {
          "balance_data.$.available_balance_of_coin": balance,
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

const delete_bid_data_with_last_price_id = (coin_id, last_price_id) => {
  return new Promise((res, rej) => {
    Coins.updateOne(
      { _id: ObjectId(coin_id) },
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

/** 
 1. FIRST GET COIN BY ITS SYMBOL FROM COIN TABLE TO GET ITS CONTRACT ADDRESS AND TOKEN TYPE .
 2. THEN GET USER ADDRESS OF COIN FROM WALLET TABLE . 
 3. NOW FROM CONTRACT ADDRESS AND USER COIN ADDRESS FIND BALANCE OF COIN .
 4. IF USER HAS ENOUGH BALANCE SO PERFORM NEXT STEP ELSE GIVE MESSAGE OF NOT ENOUGH FUND . 
 4. GET BALANCE OF COIN OF USER IN USERS TABLE FROM BALANCE_DATA IF BALANCE IS AVAILABLE SO
 available_balance ? available_balance - amount : balance_of - amount
 5. UPDATE BALANCE OF USER FOR PARTICULAR COIN, COLUMN IS BALANCE_DATA AND UPDATE WILL BE SET IF ALREADY EXIST ELSE PUSH . 
 6. UPDATE OPEN_ORDERS OF USERS, AND UPDATE WILL BE PUSH . 
 7. NOW GET LAST PRICE OF COIN WITH PARTICULAR PAIR FROM COIN TABLE TO CALCULATE CHANGE IN % . 
 8. PUT NEW PRICE IN LAST_PRICE IN COIN TABLE
 */

// ------------ TO SUCCESSFULLY FILL THE BID -----------
// GET LAST MAXIMUM BID OF BUY,
// TO FILL, CONDITION WILL BE -
// 1. IF PRICE MATCHES SO FILL ORDER OR
// 2. IF PRICE IS MORE THAN BUY BID THEN ALSO BID WILL BE FILLED .

// FOR SELL
object_data.sell_coin_by_symbol = (
  user_id,
  symbol,
  price,
  amount,
  pair_with
) => {
  return new Promise(async (resolve, reject) => {
    try {
      var balance;
      // GET COIN BY ITS SYMBOL FROM COIN TABLE
      var symbol_data = await get_coin_by_symbol(symbol);
      if (symbol_data.length > 0) {
        // FIND COIN DETAILS FROM WALLET BY USING USER ID
        var balance_data = await get_user_balance_from_register_table(
          user_id,
          symbol
        );
        // BALANCE OF USER
        var balance =
          balance_data.length == 0
            ? (balance = 0)
            : parseFloat(
                balance_data[0].balance_data.available_balance_of_coin
              );

        var total = parseFloat(parseFloat(price * amount).toFixed(8));
        console.log({ balance, total });
        if (total <= balance) {
          var total_balance, available_balance, in_order;

          // IF BALANCE_DATA IS AVAILABLE FOR COIN SO
          total_balance =
            balance_data[0].balance_data.total_balance_of_coin - total;
          available_balance =
            balance_data[0].balance_data.available_balance_of_coin - total;
          in_order = balance_data[0].balance_data.in_order - total;

          // GET LAST HIGHEST BID FOR BUY AND IF EXIST SO DEDUCT AMOUNT FROM ADDRESS OF USER AND ADD AMOUNT TO BUYER'S ADDRESS
          var buy_bid_data = await get_last_buy_bid(symbol, pair_with);
          if (
            buy_bid_data.length > 0 &&
            buy_bid_data[0].last_price.price == price
          ) {
            // GET USERS WHO BID THE FIRST FOR BUY
            var limit = buy_bid_data[0].last_price.user_data.length;
            var sorted_data = await get_last_sorted_buy_bid(
              symbol,
              pair_with,
              limit
            );

            var user_data_array = [];

            // PUT USER'S ID AND AMOUNT WHO BIDED, IN ARRAY
            for (let i = 0; i < sorted_data.length; i++) {
              const element = sorted_data[i];
              user_data_array.push({
                user_id: element.last_price.user_data.user_id,
                amount: element.last_price.user_data.amount,
              });
            }

            const session = await Users.startSession();
            session.startTransaction();
            const opts = { session };

            // DEDUCT AMOUNT FROM USER WHO BID FOR SELL AND ADD COIN TO USER WHO BIDDED FOR BUY
            var updated_data = await deduct_amount_in_users_table(
              user_id,
              symbol,
              total_balance,
              available_balance,
              in_order
            );

            var balance_data = {
              coin_id: ObjectId(symbol_data[0]._id),
              symbol: symbol.toUpperCase(),
              total_balance_of_coin: total,
              available_balance_of_coin: total,
            };

            // UPDATE BALANCE OF USER FOR PARTICULAR COIN
            var update_data = await update_balance_of_bidded_user(
              user_data_array[0].user_id,
              balance_data,
              opts
            );

            await session.commitTransaction();
            session.endSession();

            var used = await update_bid_for_sell_in_last_price(
              user_id,
              symbol,
              price,
              pair_with,
              total,
              symbol_data,
              balance,
              available_balance,
              in_order,
              amount
            );
            resolve(used);
          } else {
            var used = await update_bid_for_sell_in_last_price(
              user_id,
              symbol,
              price,
              pair_with,
              total,
              symbol_data,
              balance,
              available_balance,
              in_order,
              amount
            );
            resolve(used);
          }
        } else {
          reject("Not enough funds");
        }
      } else reject("No such coin");
    } catch (error) {
      console.log({ error });
      reject(error);
    }
  });
};

const update_status_of_bidding = async (user_id) => {
  return new Promise(async (res, rej) => {
    await get_open_orders_data_of_user;
    Users.updateOne({});
  });
};

const update_bid_for_sell_in_last_price = async (
  user_id,
  symbol,
  price,
  pair_with,
  total,
  symbol_data,
  balance,
  available_balance,
  in_order,
  amount
) => {
  return new Promise(async (res, rej) => {
    var balance_data = {
      coin_id: ObjectId(symbol_data[0]._id),
      symbol: symbol.toUpperCase(),
      total_balance_of_coin: balance,
      available_balance_of_coin: available_balance
        ? available_balance - amount
        : balance - amount,
      in_order: in_order ? in_order + amount : amount,
    };
    const session = await Users.startSession();
    session.startTransaction();
    const session1 = await Coins.startSession();
    session1.startTransaction();
    const opts = { session };
    const opts1 = { session1 };

    // UPDATE BALANCE OF USER FOR PARTICULAR COIN
    var update_data = await update_balance_of_user(user_id, balance_data, opts);

    // GET LAST PRICE OF COIN WITH PARTICULAR PAIR FROM COIN TABLE TO CALCULATE CHANGE IN %
    var data_of_price = await get_all_price_list_of_coin(symbol, pair_with);
    var last_price =
      data_of_price.length == 0
        ? 0
        : !data_of_price[0].last_price
        ? 0
        : data_of_price[0].last_price.price;

    var last_dec = await convertExponentialToDecimal(last_price);
    var change_in_percentage = await get_percentage(last_dec, price);

    var change_perc = parseFloat(parseFloat(change_in_percentage).toFixed(8));

    var last_price = {
      user_data: {
        user_id: ObjectId(user_id),
        amount: amount,
      },
      price,
      amount,
      total,
      pair_with: pair_with.toUpperCase(),
      side: "SELL",
      change_in_percentage: change_perc,
    };

    var side = "SELL",
      data = null,
      updated_data1 = null,
      pushed_data = null;
    var price_details = await get_similar_bids_for_buy(
      symbol,
      price,
      pair_with,
      side
    );

    // CHECK IF SAME AMOUNT BID IS THERE OR NOT IF EXIST SO ADD AMOUNT IN TOTAL
    if (price_details.length > 0) {
      var total_price = price_details[0].last_price.total;
      var new_total_price = parseFloat(total_price) + parseFloat(total);
      console.log({ new_total_price });
      var total_amount = price_details[0].last_price.amount;
      var new_total_amount = parseFloat(total_amount) + parseFloat(amount);
      console.log({ new_total_amount });
      updated_data1 = await update_already_bided_amount(
        price_details[0]._id,
        price_details[0].last_price._id,
        new_total_amount,
        new_total_price,
        opts1
      );
      pushed_data = await push_already_bided_amount(
        price_details[0]._id,
        price_details[0].last_price._id,
        user_id,
        amount,
        opts1
      );

      var user_data_id = await get_last_price_bid_for_sell_user_data(
        symbol,
        price,
        pair_with
      );

      var user_data_who_filling_the_bid = {
        user_id: user_data_id[0].last_price.user_data._id,
        amount,
      };

      // GET CURRENT DATE IN SYSTEMATIC ORDER
      var currentdate = await current_date();
      var open_orders_data = {
        date: currentdate,
        pair_from: symbol.toUpperCase(),
        pair_to: pair_with.toUpperCase(),
        side: "SELL",
        price,
        amount: amount,
        total,
        status: "pending",
        user_data_who_filling_the_bid,
      };

      // UPDATE OPEN ORDERS OF SELLER

      // UPDATE OPEN_ORDERS OF USERS
      var updated_data = await open_orders_data_of_users(
        user_id,
        open_orders_data,
        opts
      );

      if (
        update_data.nModified == 1 &&
        updated_data.nModified == 1 &&
        (data != null
          ? data.nModified == 1
          : updated_data1.nModified > 0 && pushed_data.nModified > 0)
      ) {
        await session.commitTransaction();
        session.endSession();
        await session1.commitTransaction();
        session1.endSession();
        res("Success");
      } else {
        await session.abortTransaction();
        session.endSession();
        await session1.abortTransaction();
        session1.endSession();
        rej("Something went wrong");
      }
    } else {
      // PUT NEW PRICE IN LAST_PRICE IN COIN TABLE
      data = await bid_for_sell(symbol, last_price, opts1);

      // GET CURRENT DATE IN SYSTEMATIC ORDER
      var currentdate = await current_date();
      var open_orders_data = {
        date: currentdate,
        pair_from: symbol.toUpperCase(),
        pair_to: pair_with.toUpperCase(),
        side: "SELL",
        price,
        amount: amount,
        total,
        status: "pending",
      };

      // UPDATE OPEN_ORDERS OF USERS
      var updated_data = await open_orders_data_of_users(
        user_id,
        open_orders_data,
        opts
      );

      if (
        update_data.nModified == 1 &&
        updated_data.nModified == 1 &&
        (data != null
          ? data.nModified == 1
          : updated_data1.nModified > 0 && pushed_data.nModified > 0)
      ) {
        await session.commitTransaction();
        session.endSession();
        await session1.commitTransaction();
        session1.endSession();
        res("Success");
      } else {
        await session.abortTransaction();
        session.endSession();
        await session1.abortTransaction();
        session1.endSession();
        rej("Something went wrong");
      }
    }

    if (
      data != null
        ? data.nModified == 1
        : updated_data1.nModified > 0 && pushed_data.nModified > 0
    ) {
    } else {
      await session.abortTransaction();
      session.endSession();
      await session1.abortTransaction();
      session1.endSession();
      rej("Something went wrong");
    }
  });
};

const get_last_price_bid_for_sell_user_data = async (
  symbol,
  price,
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
              { "last_price.price": price },
              { symbol: symbol.toUpperCase() },
              { "last_price.pair_with": pair_with.toUpperCase() },
              { status_of_coin: "active" },
              {
                "last_price.side": "SELL",
              },
            ],
          },
        },
        // Sort in ascending order
        {
          $sort: {
            "last_price.user_data._id": -1,
          },
        },
        { $limit: 1 },
      ],
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const update_balance_of_bidded_user = async (user_id, balance_data, opts) => {
  return new Promise(async (res, rej) => {
    try {
      var user_data = await get_balance_data_by_coin_id_in_users(
        user_id,
        balance_data.coin_id
      );

      if (user_data.length > 0) {
        Users.updateOne(
          {
            _id: ObjectId(user_id),
            "balance_data.coin_id": ObjectId(balance_data.coin_id),
          },
          {
            $set: {
              "balance_data.$.total_balance_of_coin":
                user_data[0].balance_data.total_balance_of_coin +
                balance_data.total_balance_of_coin,
              "balance_data.$.available_balance_of_coin":
                user_data[0].balance_data.available_balance_of_coin +
                balance_data.available_balance_of_coin,
            },
          },
          opts,
          (err, data) => {
            if (err) rej(err);
            else res(data);
          }
        );
      } else {
        Users.updateOne(
          { _id: ObjectId(user_id) },
          {
            $push: {
              balance_data,
            },
          },
          opts,
          (err, data) => {
            if (err) rej(err);
            else res(data);
          }
        );
      }
    } catch (error) {
      rej(error);
    }
  });
};

const deduct_amount_in_users_table = async (
  user_id,
  symbol,
  total_balance,
  available_balance_of_coin,
  in_order
) => {
  return new Promise((res, rej) => {
    Users.update(
      { _id: ObjectId(user_id), "balance_data.symbol": symbol.toUpperCase() },
      {
        $set: {
          "balance_data.$.total_balance_of_coin": total_balance,
          "balance_data.$.available_balance_of_coin": available_balance_of_coin,
          "balance_data.$.in_order": in_order,
        },
      },
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

const get_last_buy_bid = (symbol, pair_with) => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        {
          $match: {
            $and: [
              { symbol: symbol.toUpperCase() },
              { "last_price.pair_with": pair_with.toUpperCase() },
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
        //Limit for 1
        { $limit: 1 },
      ],
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const get_last_sorted_buy_bid = (symbol, pair_with, limit) => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        { $unwind: "$last_price.user_data" },
        {
          $match: {
            $and: [
              { status_of_coin: { $eq: "active" } },
              { symbol: symbol.toUpperCase() },
              { "last_price.pair_with": pair_with.toUpperCase() },
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
            "last_price.user_data": -1,
          },
        },
        //Limit
        { $limit: limit },
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

const bid_for_sell = async (symbol, last_price, opts) => {
  return new Promise((res, rej) => {
    Coins.updateOne(
      { symbol: symbol.toUpperCase() },
      {
        $push: {
          last_price,
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

const update_balance_of_user = async (user_id, balance_data, opts) => {
  return new Promise(async (res, rej) => {
    try {
      var user_data = await get_balance_data_by_coin_id_in_users(
        user_id,
        balance_data.coin_id
      );
      if (user_data.length > 0) {
        Users.updateOne(
          {
            _id: ObjectId(user_id),
            "balance_data.coin_id": ObjectId(balance_data.coin_id),
          },
          {
            $set: {
              "balance_data.$.total_balance_of_coin":
                balance_data.total_balance_of_coin,
              "balance_data.$.available_balance_of_coin":
                balance_data.available_balance_of_coin,
              "balance_data.$.in_order": balance_data.in_order,
            },
          },
          opts,
          (err, data) => {
            if (err) rej(err);
            else res(data);
          }
        );
      } else {
        Users.updateOne(
          { _id: ObjectId(user_id) },
          {
            $push: {
              balance_data,
            },
          },
          opts,
          (err, data) => {
            if (err) rej(err);
            else res(data);
          }
        );
      }
    } catch (error) {
      rej(error);
    }
  });
};

const get_balance_data_by_coin_id_in_users = async (user_id, coin_id) => {
  return new Promise((res, rej) => {
    Users.aggregate(
      [
        { $unwind: "$balance_data" },
        {
          $match: {
            $and: [
              { _id: { $eq: ObjectId(user_id) } },
              {
                "balance_data.coin_id": {
                  $eq: ObjectId(coin_id),
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

const open_orders_data_of_users = async (user_id, open_orders_data, opts) =>
  new Promise((res, rej) => {
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

/** 
 1. FIRST GET COIN BY ITS SYMBOL FROM PAIR_WITH FROM COIN TABLE TO GET ITS CONTRACT ADDRESS AND TOKEN TYPE .
 2. THEN GET USER ADDRESS OF COIN FROM WALLET TABLE . 
 3. NOW FROM CONTRACT ADDRESS AND USER COIN ADDRESS FIND BALANCE OF COIN .
 4. IF USER HAS ENOUGH BALANCE SO PERFORM NEXT STEP ELSE GIVE MESSAGE OF NOT ENOUGH FUND . 
 4. GET BALANCE OF COIN OF USER IN USERS TABLE FROM BALANCE_DATA IF BALANCE IS AVAILABLE SO
 available_balance ? available_balance - amount : balance_of - amount
 5. UPDATE BALANCE OF USER FOR PARTICULAR COIN, COLUMN IS BALANCE_DATA AND UPDATE WILL BE SET IF ALREADY EXIST ELSE PUSH . 
 6. UPDATE OPEN_ORDERS OF USERS, AND UPDATE WILL BE PUSH . 
 7. NOW GET LAST PRICE OF COIN WITH PARTICULAR PAIR FROM COIN TABLE TO CALCULATE CHANGE IN % . 
 8. PUT NEW PRICE IN LAST_PRICE IN COIN TABLE
 */

// FOR BUY
object_data.buy_coin = (user_id, symbol, price, amount, pair_with) => {
  return new Promise(async (res, rej) => {
    try {
      // GET COIN DETAILS FOR CONTRACT ADDRESS
      var symbol_data = await get_coin_by_symbol(pair_with);

      if (symbol_data.length > 0) {
        var contract_address = symbol_data[0].contract_address;
        var token_type = symbol_data[0].token_type;
        var wallet_coin_type =
          token_type == "trc20"
            ? "TRON"
            : token_type == "erc20"
            ? "ETH"
            : "BTC";

        // GET DATA OF USER FROM WALLET
        var user_data = await find_wallet_by_user_id(user_id, wallet_coin_type);
        if (user_data.length == 0) {
          rej("Please create wallet");
        } else {
          var user_address = user_data[0].crypto_details.address;
          console.log({ user_address });
          var balance = await get_balance_of_trc20_token(
            contract_address,
            user_address
          );
          var total = parseFloat(parseFloat(price * amount).toFixed(8));
          console.log({ balance, total });
          if (total <= balance) {
            const session = await Users.startSession();
            session.startTransaction();
            const session1 = await Coins.startSession();
            session1.startTransaction();
            const opts = { session };
            const opts1 = { session1 };

            // GET CURRENT DATE IN SYSTEMATIC ORDER
            var currentdate = await current_date();
            var open_orders_data = {
              date: currentdate,
              pair_from: symbol.toUpperCase(),
              pair_to: pair_with.toUpperCase(),
              side: "BUY",
              price,
              amount,
              total,
              status: "pending",
            };

            // UPDATE OPEN_ORDERS OF USERS
            var updated_data = await open_orders_data_of_users(
              user_id,
              open_orders_data,
              opts
            );

            // GET LAST PRICE OF COIN WITH PARTICULAR PAIR FROM COIN TABLE TO CALCULATE CHANGE IN %
            var data_of_price = await get_all_price_list_of_coin(
              symbol,
              pair_with
            );
            var last_price =
              data_of_price.length == 0
                ? 0
                : !data_of_price[0].last_price
                ? 0
                : data_of_price[0].last_price.price;
            var last_dec = await convertExponentialToDecimal(last_price);
            var change_in_percentage = await get_percentage(last_dec, price);

            var change_perc = parseFloat(
              parseFloat(change_in_percentage).toFixed(8)
            );
            var last_price = {
              user_data: {
                user_id: ObjectId(user_id),
                amount: amount,
              },
              price,
              amount,
              total,
              pair_with: pair_with.toUpperCase(),
              side: "BUY",
              change_in_percentage: change_perc,
            };
            var side = "BUY",
              data = null,
              updated_data1 = null,
              pushed_data = null;
            var price_details = await get_similar_bids_for_buy(
              symbol,
              price,
              pair_with,
              side
            );

            // CHECK IF SAME AMOUNT BID IS THERE OR NOT IF EXIST SO ADD AMOUNT IN TOTAL
            if (price_details.length > 0) {
              var total_price = price_details[0].last_price.total;
              var new_total_price = parseFloat(total_price) + parseFloat(total);
              console.log({ new_total_price });
              var total_amount = price_details[0].last_price.amount;
              var new_total_amount =
                parseFloat(total_amount) + parseFloat(amount);
              console.log({ new_total_amount });
              updated_data1 = await update_already_bided_amount(
                price_details[0]._id,
                price_details[0].last_price._id,
                new_total_amount,
                new_total_price,
                opts1
              );
              pushed_data = await push_already_bided_amount(
                price_details[0]._id,
                price_details[0].last_price._id,
                user_id,
                amount,
                opts1
              );
            } else {
              // PUT NEW PRICE IN LAST_PRICE IN COIN TABLE
              data = await bid_for_sell(symbol, last_price, opts1);
            }
            if (
              updated_data.nModified == 1 &&
              (data != null
                ? data.nModified == 1
                : updated_data1.nModified > 0 && pushed_data.nModified > 0)
            ) {
              await session.commitTransaction();
              session.endSession();
              await session1.commitTransaction();
              session1.endSession();
              res("Success");
            } else {
              await session.abortTransaction();
              session.endSession();
              await session1.abortTransaction();
              session1.endSession();
              rej("Something went wrong");
            }
          } else rej("Not enough fund");
        }
      } else rej("No such coin");
    } catch (error) {
      console.log({ error });
      rej(error);
    }
  });
};

const update_already_bided_amount = (
  coin_id,
  last_price_id,
  total_amount,
  total,
  opts1
) => {
  return new Promise((res, rej) => {
    Coins.update(
      { _id: ObjectId(coin_id), "last_price._id": ObjectId(last_price_id) },
      {
        $set: {
          "last_price.$.amount": total_amount,
          "last_price.$.total": total,
        },
      },
      opts1,
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const push_already_bided_amount = (
  coin_id,
  last_price_id,
  user_id,
  amount,
  opts1
) => {
  return new Promise((res, rej) => {
    Coins.update(
      { _id: ObjectId(coin_id), "last_price._id": ObjectId(last_price_id) },
      {
        $push: {
          "last_price.$.user_data": {
            user_id: ObjectId(user_id),
            amount,
          },
        },
      },
      opts1,
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const get_similar_bids_for_buy = (symbol, price, pair_with, side) => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        {
          $match: {
            $and: [
              {
                symbol: {
                  $eq: symbol.toUpperCase(),
                },
              },
              {
                "last_price.side": {
                  $eq: side,
                },
              },
              {
                "last_price.price": {
                  $eq: price,
                },
              },
              {
                "last_price.pair_with": {
                  $eq: pair_with.toUpperCase(),
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

// GET DATA FROM ARRAY OF OBJECT AND ARRAY DATA WILL BE IN DESCENDING ORDER WITH LIMIT 1
const get_all_price_list_of_coin = async (symbol, pair_with) => {
  return new Promise((res, rej) => {
    Coins.aggregate(
      [
        { $unwind: "$last_price" },
        {
          $match: {
            $and: [
              { symbol: { $eq: symbol.toUpperCase() } },
              { "last_price.pair_with": { $eq: pair_with.toUpperCase() } },
            ],
          },
        },
        { $sort: { "last_price._id": -1 } },
        { $limit: 1 },
      ],
      (err, data) => {
        if (err) rej(err);
        else res(data);
      }
    );
  });
};

const get_percentage = async (last_price, current_price) => {
  if (last_price == 0) {
    return 0;
  } else {
    var current = parseFloat(parseFloat(current_price).toFixed(8));
    var result = ((current - last_price) / last_price) * 100;
    return result;
  }

  // CALCULATE % HIGH OR LOW
  // last = 100
  // current = 150
  // 50 = 150-100
  // (50/last) * 100
};

module.exports = object_data;

// var last_price_id = highest_bid[0].last_price._id;
//               var highest_bid_price = highest_bid[0].last_price.price;
//               var bid_amount = highest_bid[0].last_price.amount;

//               var user_data_array = [];
//               // GET SORTED USER_DATA IN COIN TABLE, STORE IN ARRAY AND THEN DELETE IT FROM DATABASE
//               var sorted_user_data = await get_sorted_user_data_in_last_price_in_coin_table_for_sell_last_price_id(
//                 last_price_id,
//                 symbol,
//                 pair_with
//               );

//               user_data_array = sorted_user_data;

//               if (highest_bid_price == price) {
//                 // CHECK BID_AMOUNT IS EQUAL TO BIDDED AMOUNT
//                 if (bid_amount == amount) {
//                   var coin_id = sorted_data[0]._id;
//                   var last_price_id = sorted_user_data[0].last_price._id;

//                   // DELETE LAST_PRICE OBJECT OF BUY BID
//                   var deleted_data = await delete_bid_data_with_last_price_id(
//                     coin_id,
//                     last_price_id
//                   );

//                   // deleted_data.nModified > 0

//                   // UPDATE OPEN_ORDERS_DATA FROM PENDING TO CONFIRMED FOR BUYERS
//                   for (let i = 0; i < user_data_array.length; i++) {
//                     const element = user_data_array[i];
//                     var user_order_id = ObjectId(
//                       element.last_price.user_data._id
//                     );
//                     var users_id = element.last_price.user_data.user_id;
//                     var user_data_who_filling_the_bid = {
//                       user_id: ObjectId(user_id),
//                       bid_id: ObjectId(user_order_id),
//                       amount: element.last_price.user_data.amount,
//                     };
//                     var update_order_to_confirmed = await update_open_orders_data_pending_to_confirmed(
//                       users_id,
//                       user_order_id,
//                       user_data_who_filling_the_bid
//                     );
//                   }

//                   // GET LAST PUSHED SELL BID
//                   var last_sell_bid = await get_last_buy_bid_in_coin_table(
//                     symbol,
//                     price,
//                     pair_with
//                   );

//                   var coin_id = last_sell_bid[0]._id;
//                   var last_price_id = last_sell_bid[0].last_price._id;

//                   // DELETE LAST_PRICE OBJECT OF SELL BID
//                   var deleted_data = await delete_bid_data_with_last_price_id(
//                     coin_id,
//                     last_price_id
//                   );

//                   // UPDATE OPEN_ORDERS_DATA FROM PENDING TO CONFIRMED FOR SELLER
//                   for (let i = 0; i < last_sell_bid.length; i++) {
//                     const element = last_sell_bid[i];
//                     var user_order_id = ObjectId(
//                       element.last_price.user_data[0]._id
//                     );
//                     var users_id = element.last_price.user_data[0].user_id;
//                     var user_data_who_filling_the_bid = {
//                       user_id: ObjectId(user_id),
//                       bid_id: ObjectId(user_order_id),
//                       amount: element.last_price.user_data[0].amount,
//                     };
//                     var update_order_to_confirmed = await update_open_orders_data_pending_to_confirmed(
//                       users_id,
//                       user_order_id,
//                       user_data_who_filling_the_bid
//                     );
//                   }

//                   // SET BALANCE OF USER WHO BID FOR BUY
//                   var new_balance = balance1 + decimal_amount;

//                   console.log({ old_balance: balance1, new_balance });

//                   // UPDATE BALANCE OF USER WHO BID FOR BUY
//                   var update_balance = await update_balance_data_of_user(
//                     user_id,
//                     new_balance,
//                     symbol
//                   );

//                   // GET BALANCE OF PAIR_WITH COIN OF BUYER
//                   var seller_balance_data = await check_coin_exist_in_registers_table(
//                     user_id,
//                     pair_with
//                   );

//                   var pair_with_seller_balance = parseFloat(
//                     parseFloat(
//                       seller_balance_data[0].balance_data
//                         .available_balance_of_coin - total
//                     ).toFixed(8)
//                   );

//                   var update_balance_of_pair_with = await update_balance_data_of_user(
//                     user_id,
//                     pair_with_seller_balance,
//                     pair_with
//                   );

//                   for (let i = 0; i < user_data_array.length; i++) {
//                     const element = user_data_array[i];
//                     var uid = element.last_price.user_data.user_id;
//                     var buyer_amount = element.last_price.user_data.amount;
//                     var check_data = await check_coin_exist_in_registers_table(
//                       uid,
//                       symbol
//                     );

//                     // UPDATE PAIR_WITH COIN BALANCE IN SELLER ID
//                     var buyer_pair_with_balance = await check_coin_exist_in_registers_table(
//                       uid,
//                       pair_with
//                     );

//                     var buyer_pair_with_amount = parseFloat(
//                       parseFloat(buyer_amount * price).toFixed(8)
//                     );

//                     var pair_with_buyer_balance = parseFloat(
//                       parseFloat(
//                         buyer_pair_with_balance[0].balance_data
//                           .available_balance_of_coin + buyer_pair_with_amount
//                       ).toFixed(8)
//                     );

//                     update_balance_data_of_user(
//                       uid,
//                       pair_with_buyer_balance,
//                       pair_with
//                     );

//                     // UPDATE BALANCE OF USER WHO BID FOR BUY

//                     // CHECK IF COIN DATA EXIST OR NOT
//                     // IF NOT
//                     // SO PUSH NEW OBJECT OF BALANCE_DATA FOR USER IN REGISTER TABLE
//                     // ELSE
//                     // ADD BALANCE IN USER
//                     if (check_data.length > 0) {
//                       var buyer_balance =
//                         check_data[0].balance_data.available_balance_of_coin;
//                       var buyer_new_balance = parseFloat(
//                         parseFloat(buyer_balance - buyer_amount).toFixed(8)
//                       );

//                       var update_balance = await update_balance_data_of_user(
//                         uid,
//                         buyer_new_balance,
//                         symbol
//                       );
//                     } else {
//                       var balance_data_object = {
//                         coin_id: ObjectId(symbol_coin_id),
//                         symbol: symbol.toUpperCase(),
//                         total_balance_of_coin: buyer_amount,
//                         available_balance_of_coin: buyer_amount,
//                         in_order: 0,
//                       };
//                       var pushed_balance_data = await push_balance_data_of_user(
//                         uid,
//                         balance_data_object
//                       );
//                     }
//                   }

//                   res("Success");
//                 } else {
//                   console.log("else");
//                 }
//               } else {
//                 res("Success");
//               }
