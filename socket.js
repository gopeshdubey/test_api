const get_order_book = (io) => {

  // This is what the socket.io syntax is like, we will work this later
  io.on("connection", (socket) => {
    // socket object may be used to send specific messages to the new connected client
    console.log("new client connected");
  });
};

module.exports = get_order_book;
