// Só customLaunchers — o Angular CLI mantém frameworks/plugins (evita erro __karma__.start).
module.exports = function (config) {
  config.customLaunchers = {
    ...(config.customLaunchers || {}),
    ChromeHeadlessCI: {
      base: 'ChromeHeadless',
      flags: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--headless=new',
      ],
    },
  };
};
