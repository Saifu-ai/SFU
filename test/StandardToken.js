import { EVMThrow, assertEqual } from './utils';

const SaifuToken = artifacts.require('SaifuToken');

contract('SaifuToken', (wallets) => {
  const owner = wallets[0];
  const accountTwo = wallets[2];
  const accountThree = wallets[3];

  const DECIMALS = 18;

  const firstAccountAmount = 200e6 * (10 ** DECIMALS);
  const overflowAmount = 12 * (10 ** DECIMALS);
  const allowAmount = 5 * (10 ** DECIMALS);
  const changeAllowedAmount = 2 * (10 ** DECIMALS);
  const allowableAmount = 4 * (10 ** DECIMALS);
  const unallowableAmount = 8 * (10 ** DECIMALS);

  beforeEach(async function () {
    // given
    this.token = await SaifuToken.new();

    await this.token.approve(accountTwo, allowAmount, { from: owner });
  });

  describe('Standard token tests', () => {
    it('should set allowable amount of tokens for a spender', async function () {
      // when
      await this.token.approve(accountTwo, changeAllowedAmount, { from: owner });

      // then
      const accountTwoAllowance = (await this.token.allowance(owner, accountTwo)).toNumber();
      assertEqual(accountTwoAllowance, changeAllowedAmount);
    });

    it('should increase allowed amount of tokens for a spender', async function () {
      // when
      await this.token.increaseApproval(accountTwo, changeAllowedAmount, { from: owner });

      // then
      const accountTwoAllowance = (await this.token.allowance(owner, accountTwo)).toNumber();
      assertEqual(accountTwoAllowance, allowAmount + changeAllowedAmount);
    });

    it('should decrease allowed amount of tokens for a spender', async function () {
      // when
      await this.token.decreaseApproval(accountTwo, changeAllowedAmount, { from: owner });

      // then
      const accountTwoAllowance = (await this.token.allowance(owner, accountTwo)).toNumber();
      assertEqual(accountTwoAllowance, allowAmount - changeAllowedAmount);
    });

    it('should decrease allowed amount of tokens to 0 for a spender if sender uses too much value while decrease', async function () {
      // when
      await this.token.decreaseApproval(accountTwo, overflowAmount, { from: owner });

      // then
      const accountTwoAllowance = (await this.token.allowance(owner, accountTwo)).toNumber();
      assertEqual(accountTwoAllowance, 0);
    });

    it('should transfer tokens from one account to another', async function () {
      // when
      await this.token.transferFrom(
        owner,
        accountThree,
        allowableAmount,
        { from: accountTwo },
      );

      // then
      const accountOneBalance = (await this.token.balanceOf(owner)).toNumber();
      assertEqual(accountOneBalance, firstAccountAmount - allowableAmount);

      const accountThreeBalance = (await this.token.balanceOf(accountThree)).toNumber();
      assertEqual(accountThreeBalance, allowableAmount);

      const accountTwoAllowance = (await this.token.allowance(owner, accountTwo)).toNumber();
      assertEqual(accountTwoAllowance, allowAmount - allowableAmount);
    });

    it('should not transfer tokens from one account to another if token holder does not have enough tokens', async function () {
      // when
      const transferFrom = this.token.transferFrom(
        owner,
        accountThree,
        overflowAmount,
        { from: accountTwo },
      );

      // then
      await transferFrom.should.be.rejectedWith(EVMThrow);

      const accountOneBalance = (await this.token.balanceOf(owner)).toNumber();
      assertEqual(accountOneBalance, firstAccountAmount);

      const accountThreeBalance = (await this.token.balanceOf(accountThree)).toNumber();
      assertEqual(accountThreeBalance, 0);

      const accountTwoAllowance = (await this.token.allowance(owner, accountTwo)).toNumber();
      assertEqual(accountTwoAllowance, allowAmount);
    });

    it('should not transfer tokens from one account to another if sender does not have enough allowance', async function () {
      // when
      const transferFrom = this.token.transferFrom(
        owner,
        accountThree,
        unallowableAmount,
        { from: accountTwo },
      );

      // then
      await transferFrom.should.be.rejectedWith(EVMThrow);

      const accountOneBalance = (await this.token.balanceOf(owner)).toNumber();
      assertEqual(accountOneBalance, firstAccountAmount);

      const accountThreeBalance = (await this.token.balanceOf(accountThree)).toNumber();
      assertEqual(accountThreeBalance, 0);

      const accountTwoAllowance = (await this.token.allowance(owner, accountTwo)).toNumber();
      assertEqual(accountTwoAllowance, allowAmount);
    });

    it('should not transfer tokens from one account to another if sender uses 0x0 address as destination account', async function () {
      // when
      const transferFrom =
        this.token.transferFrom(owner, 0x0, allowableAmount, { from: accountTwo });

      // then
      await transferFrom.should.be.rejectedWith(EVMThrow);

      const accountOneBalance = (await this.token.balanceOf(owner)).toNumber();
      assertEqual(accountOneBalance, firstAccountAmount);

      const accountTwoAllowance = (await this.token.allowance(owner, accountTwo)).toNumber();
      assertEqual(accountTwoAllowance, allowAmount);
    });
  });
});
