const TronWeb = require("tronweb");

const start_tronweb = async () => {
  try {
    const HttpProvider = await TronWeb.providers.HttpProvider;
    const fullNode = await new HttpProvider("https://api.trongrid.io");
    var tronWeb = await new TronWeb(fullNode, fullNode, fullNode);
    return tronWeb
  } catch (error) {
      return error
  }
};

module.exports = start_tronweb