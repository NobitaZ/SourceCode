const mongoose = require("mongoose");
// const config = require("./keys");
const log = require("electron-log");
let _db;
// module.exports = {
//     connectToServer: () => {
//         let result = false;
//         let db = process.env.NODE_ENV !== "development" ? config.mongoURI : config.remoteDB;
//         mongoose
//             .connect(db, { keepAlive: true, useNewUrlParser: true, useUnifiedTopology: true })
//             .then((v) => {
//                 console.log("MongoDB Connected");
//                 _db = mongoose.connection;
//                 result = true;
//             })
//             .catch((err) => {
//                 log.error(err);
//                 console.log("MongoDB Error");
//             });
//         return result;
//     },
//     getDb: () => {

//         return mongoose.connection;
//     },
// };

module.exports = {
  connectToServer: () => {
    let db =
      process.env.NODE_ENV !== "development" ? process.env.PRODUCTION_DB2 : process.env.LOCAL_DB;
    log.info(process.env.PRODUCTION_DB2);
    mongoose
      .connect(db, { keepAlive: true, useNewUrlParser: true, useUnifiedTopology: true })
      .then(() => {
        console.log("MongoDB Connected");
        log.info("MongoDB Connected");
      })
      .catch((err) => {
        console.log("MongoDB Error");
        log.error(err);
      });

    global.db = global.db ? global.db : mongoose.connection;
    // mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true });
    // _db = mongoose.connection;
  },
  getDb: () => {
    return global.db;
  },
};
