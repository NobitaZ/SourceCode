const winston = require("winston");
// const WinstonLogStash = require("winston3-logstash-transport");
// const { combine, timestamp, label, printf } = winston.format;
const MESSAGE = Symbol.for("message");

const jsonFormatter = (logEntry) => {
  const base = { timestamp: new Date(), app_name: "Zazzle" };
  const json = Object.assign(base, logEntry);
  logEntry[MESSAGE] = JSON.stringify(json);
  return logEntry;
};

const logger = winston.createLogger({
  level: "info",
  format: winston.format(jsonFormatter)(),
  transports: [
    // new WinstonLogStash({
    //   mode: "tcp6",
    //   host: process.env.LOG_HOST,
    //   port: 5010,
    // }),
    // new winston.transports.File({ filename: "./logs/error.log", level: "error" }),
    new winston.transports.Http({
      host: process.env.LOG_HOST,
      port: process.env.LOG_PORT,
      ssl: false,
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

module.exports = logger;
