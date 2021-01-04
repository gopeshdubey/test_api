const mongoose = require("mongoose");

var db1 = mongoose.createConnection('mongodb+srv://gopesh:gopesh123@cluster0.on5bp.mongodb.net/arowex_backup?retryWrites=true&w=majority')

// mongoose.createConnection('mongodb+srv://gopesh:gopesh123@cluster0.on5bp.mongodb.net/Exchange?retryWrites=true&w=majority')

var db2 = mongoose.createConnection('mongodb+srv://gopesh:gopesh123@cluster0.on5bp.mongodb.net/arowex_backup?retryWrites=true&w=majority')

// mongoose.connect(
//     "mongodb+srv://gopesh:gopesh123@cluster0.on5bp.mongodb.net/Exchange?retryWrites=true&w=majority", {
//         useNewUrlParser: true,
//         useUnifiedTopology: true
//     }
// );

// mongoose.connection.on("connected", () => {
//     console.log("Connected to Mongo DB....");
// });

module.exports = { db1, db2 }
