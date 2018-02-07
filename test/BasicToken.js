import { EVMThrow, assertEqual } from './utils';

const SaifuToken = artifacts.require('SaifuToken');

contract('SaifuToken', (wallets) => {
  const owner = wallets[0];
  const accountTwo = wallets[2];

  const DECIMALS = 18;

  const firstAccountAmount = 200e6 * (10 ** DECIMALS);
  const AMOUNT_TOKENS_FOR_SELL = 130e6 * (10 ** DECIMALS);
  const transferAllowedAmount = 4 * (10 ** DECIMALS);
  const transferUnallowedAmount = 250e6 * (10 ** DECIMALS);

  beforeEach(async function () {
    // given
    this.token = await SaifuToken.new();
  });

  describe('Basic token tests', () => {
    it('should increase account balance after mint', async function () {
      // then
      const accountOneBalance = (await this.token.balanceOf(owner)).toNumber();
      assertEqual(accountOneBalance, AMOUNT_TOKENS_FOR_SELL);
    });

    it('should provide correct total supply', async function () {
      // then
      const totalSupply = (await this.token.totalSupply()).toNumber();
      assertEqual(totalSupply, firstAccountAmount);
    });

    it('should transfer tokens to another account', async function () {
      // when
      await this.token.transfer(accountTwo, transferAllowedAmount, { from: owner });

      // then
      const accountOneBalance = (await this.token.balanceOf(owner)).toNumber();
      assertEqual(accountOneBalance, AMOUNT_TOKENS_FOR_SELL - transferAllowedAmount);

      const accountTwoBalance = (await this.token.balanceOf(accountTwo)).toNumber();
      assertEqual(accountTwoBalance, transferAllowedAmount);
    });

    it('should not transfer tokens if sender does not have enough tokens', async function () {
      // when
      const transfer = this.token.transfer(
        accountTwo,
        transferUnallowedAmount,
        { from: owner },
      );

      // then
      await transfer.should.be.rejectedWith(EVMThrow);

      const accountOneBalance = (await this.token.balanceOf(owner)).toNumber();
      assertEqual(accountOneBalance, AMOUNT_TOKENS_FOR_SELL);

      const accountTwoBalance = (await this.token.balanceOf(accountTwo)).toNumber();
      assertEqual(accountTwoBalance, 0);
    });
  });
});
