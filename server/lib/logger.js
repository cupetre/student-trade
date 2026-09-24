// Single shared pino logger for the whole server.
//
// Every log line gets a `level` (info / warn / error / fatal / debug /
// trace) instead of living in a separate file per severity — that's how
// pino, and most modern logging tools, expect to work: one stream, filter
// by level when you're looking for something. In dev it prints in color;
// in production it prints raw JSON, which is what you feed to a log file
// or an aggregator later without changing any code here.
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
});

module.exports = logger;
