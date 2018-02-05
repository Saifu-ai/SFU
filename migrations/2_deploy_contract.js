const SaifuToken = artifacts.require('./SaifuToken.sol');

module.exports = (deployer) => {
  deployer.deploy(SaifuToken);
};
