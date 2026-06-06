const logger = {
  debug: (...data) => {
    if (window.DEBUG_LOG) {
        console.debug(...data);
    }
  },
  log: console.log,
  warn: console.warn,
  error: console.error
};

export default logger;