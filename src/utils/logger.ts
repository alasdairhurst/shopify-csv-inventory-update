const DEBUG_LOG = false;

const logger = {
  debug: (...data: any[]) => {
    if (DEBUG_LOG) {
        console.debug(...data);
    }
  },
  log: console.log,
  warn: console.warn,
  error: console.error
};

export default logger;