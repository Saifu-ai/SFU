import { EVMThrow, assertEqual, timeController } from './utils';

const SaifuToken = artifacts.require('SaifuToken');

contract('SaifuToken', (wallets) => {
  const owner = wallets[0];
  const accountWithTokens = wallets[1];
  const accountOne = wallets[2];
  const accountTwo = wallets[3];
  const burnAddress = wallets[4];
  const reserveFundsAddress = wallets[5];
  const reserveTeamAddress = wallets[6];
  const notOwner = wallets[9];

  const DECIMALS = 18;
  const RESERVED_FUNDS = 20e6 * (10 ** DECIMALS);
  const AMOUNT_TOKENS_FOR_SELL = 130e6 * (10 ** DECIMALS);
  const amountForTeam = 10e6 * (10 ** DECIMALS);

  const notFreeze = 0;
  const halfYear = 86400 * 180;
  const year = 86400 * 365;

  const tokensOnAccount = 10 * (10 ** DECIMALS);
  const changeAllowedAmount = 5 * (10 ** DECIMALS);
  const transferAllowedAmount = 4 * (10 ** DECIMALS);
  const amountForBurn = 2e6 * (10 ** DECIMALS);

  describe('Saifu token tests', () => {
    beforeEach(async function () {
      // given
      this.token = await SaifuToken.new();
    });

    it('should have correct parameters', async function () {
      // given
      const expectedTokenName = 'Saifu';
      const expectedTokenSymbol = 'SFU';
      const expectedTokenDecimals = 18;

      // then
      const tokenName = await this.token.name();
      assertEqual(tokenName, expectedTokenName);

      const tokenSymbol = await this.token.symbol();
      assertEqual(tokenSymbol, expectedTokenSymbol);

      const tokenDecimals = (await this.token.decimals()).toNumber();
      assertEqual(tokenDecimals, expectedTokenDecimals);
    });

    it('should have correct total supply of tokens', async function () {
      // then
      const initialTotalSupply = (await this.token.INITIAL_TOTAL_SUPPLY()).toNumber();

      const totalSupply = (await this.token.totalSupply()).toNumber();
      assertEqual(totalSupply, initialTotalSupply);

      const balance = (await this.token.balanceOf(owner)).toNumber();
      assertEqual(balance, AMOUNT_TOKENS_FOR_SELL);
    });

    it('should transfer tokens', async function () {
      // when
      await this.token.transfer(
        accountTwo,
        transferAllowedAmount,
        { from: owner },
      );

      // then
      const accountTwoBalance = (await this.token.balanceOf(accountTwo)).toNumber();
      assertEqual(accountTwoBalance, transferAllowedAmount);
    });

    it('should transfer tokens from one account to another', async function () {
      // given
      await this.token.transfer(
        accountWithTokens,
        tokensOnAccount,
        { from: owner },
      );

      // when
      await this.token.approve(accountOne, changeAllowedAmount, { from: accountWithTokens });

      await this.token.transferFrom(
        accountWithTokens,
        accountTwo,
        transferAllowedAmount,
        { from: accountOne },
      );

      // then
      const accountTwoBalance = (await this.token.balanceOf(accountTwo)).toNumber();
      assertEqual(accountTwoBalance, transferAllowedAmount);

      const accountOneAllowance = (
        await this.token.allowance(accountWithTokens, accountOne)
      ).toNumber();
      assertEqual(accountOneAllowance, changeAllowedAmount - transferAllowedAmount);
    });

    it('should set burn address', async function () {
      // when
      await this.token.setBurnAddress(
        burnAddress,
        { from: owner },
      );

      // then
      const address = await this.token.burnAddress();
      assertEqual(burnAddress, address);
    });

    it('should send reserve for funds', async function () {
      // when
      await this.token.reserveFunds(
        reserveFundsAddress,
        { from: owner },
      );

      // then
      const balance = (await this.token.balanceOf(reserveFundsAddress)).toNumber();
      assertEqual(RESERVED_FUNDS, balance);
    });

    it('should send reserve for team without freeze', async function () {
      // when
      await this.token.reserveForTeam(
        reserveTeamAddress,
        amountForTeam,
        notFreeze,
        { from: owner },
      );

      // then
      const balance = (await this.token.balanceOf(reserveTeamAddress)).toNumber();
      assertEqual(amountForTeam, balance);

      const alreadySend = (await this.token.alreadyReservedForTeam()).toNumber();
      assertEqual(amountForTeam, alreadySend);
    });

    it('should send reserve for team with freeze', async function () {
      // when
      await this.token.reserveForTeam(
        reserveTeamAddress,
        amountForTeam,
        halfYear,
        { from: owner },
      );

      // then
      const balance = (await this.token.balanceOf(reserveTeamAddress)).toNumber();
      assertEqual(0, balance);

      const lockedAddress = await this.token.getLockedContract(reserveTeamAddress);
      const lockedBalance = (await this.token.balanceOf(lockedAddress)).toNumber();
      assertEqual(amountForTeam, lockedBalance);

      const alreadySend = (await this.token.alreadyReservedForTeam()).toNumber();
      assertEqual(amountForTeam, alreadySend);
    });

    it('should unlock tokens for team member', async function () {
      // when
      await this.token.reserveForTeam(
        reserveTeamAddress,
        amountForTeam,
        halfYear,
        { from: owner },
      );

      // then
      let balance = (await this.token.balanceOf(reserveTeamAddress)).toNumber();
      assertEqual(0, balance);

      let lockedAddress = await this.token.getLockedContract(reserveTeamAddress);
      let lockedBalance = (await this.token.balanceOf(lockedAddress)).toNumber();
      assertEqual(amountForTeam, lockedBalance);

      const alreadySend = (await this.token.alreadyReservedForTeam()).toNumber();
      assertEqual(amountForTeam, alreadySend);

      await timeController.addSeconds(year);


      await this.token.unlockTokens(reserveTeamAddress, { from: owner });

      balance = (await this.token.balanceOf(reserveTeamAddress)).toNumber();
      assertEqual(amountForTeam, balance);

      lockedAddress = await this.token.getLockedContract(reserveTeamAddress);
      lockedBalance = (await this.token.balanceOf(lockedAddress)).toNumber();
      assertEqual(0, lockedBalance);
    });

    it('should reject request for unlock tokens for team member if call not owner', async function () {
      // when
      await this.token.reserveForTeam(
        reserveTeamAddress,
        amountForTeam,
        halfYear,
        { from: owner },
      );

      // then
      let balance = (await this.token.balanceOf(reserveTeamAddress)).toNumber();
      assertEqual(0, balance);

      let lockedAddress = await this.token.getLockedContract(reserveTeamAddress);
      let lockedBalance = (await this.token.balanceOf(lockedAddress)).toNumber();
      assertEqual(amountForTeam, lockedBalance);

      const alreadySend = (await this.token.alreadyReservedForTeam()).toNumber();
      assertEqual(amountForTeam, alreadySend);

      await timeController.addSeconds(year);


      const unlockTokens = this.token.unlockTokens(reserveTeamAddress, { from: notOwner });
      await unlockTokens.should.be.rejectedWith(EVMThrow);

      balance = (await this.token.balanceOf(reserveTeamAddress)).toNumber();
      assertEqual(0, balance);

      lockedAddress = await this.token.getLockedContract(reserveTeamAddress);
      lockedBalance = (await this.token.balanceOf(lockedAddress)).toNumber();
      assertEqual(amountForTeam, lockedBalance);
    });

    it('should burn tokens from address', async function () {
      // given
      await this.token.setBurnAddress(
        burnAddress,
        { from: owner },
      );

      await this.token.transfer(
        burnAddress,
        amountForBurn,
        { from: owner },
      );

      let balance = (await this.token.balanceOf(burnAddress)).toNumber();
      assertEqual(amountForBurn, balance);

      // when
      await this.token.burnFromAddress(
        amountForBurn,
        { from: owner },
      );

      // then
      balance = (await this.token.balanceOf(burnAddress)).toNumber();
      assertEqual(0, balance);
    });

    it('should reject request for set burn address if call not owner', async function () {
      // when
      const setBurnAddress = this.token.setBurnAddress(
        burnAddress,
        { from: notOwner },
      );

      await setBurnAddress.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for send reserve for funds if call not owner', async function () {
      // when
      const reserveFunds = this.token.reserveFunds(
        reserveFundsAddress,
        { from: notOwner },
      );

      await reserveFunds.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for send reserve for team if call not owner', async function () {
      // when
      const reserveForTeam = this.token.reserveForTeam(
        reserveTeamAddress,
        amountForTeam,
        notFreeze,
        { from: notOwner },
      );

      await reserveForTeam.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for burn tokens from address if call not owner', async function () {
      // given
      await this.token.setBurnAddress(
        burnAddress,
        { from: owner },
      );

      await this.token.transfer(
        burnAddress,
        amountForBurn,
        { from: owner },
      );

      let balance = (await this.token.balanceOf(burnAddress)).toNumber();
      assertEqual(amountForBurn, balance);

      // when
      const burnFromAddress = this.token.burnFromAddress(
        amountForBurn,
        { from: notOwner },
      );
      await burnFromAddress.should.be.rejectedWith(EVMThrow);

      // then
      balance = (await this.token.balanceOf(burnAddress)).toNumber();
      assertEqual(amountForBurn, balance);
    });
  });
});
