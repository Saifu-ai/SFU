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
  const investorAddress = wallets[7];
  const notOwner = wallets[9];

  const DECIMALS = 18;
  const RESERVE_FUND = 20e6 * (10 ** DECIMALS);
  const RESERVED_TOTAL = 70e6 * (10 ** DECIMALS);
  const AMOUNT_TOKENS_FOR_SELL = 130e6 * (10 ** DECIMALS);
  const amountForTeam = 10e6 * (10 ** DECIMALS);
  const wrongAmountForTeam = 45e6 * (10 ** DECIMALS);
  const amountForInvestor = 50e6 * (10 ** DECIMALS);

  const notFreeze = 0;
  const day = 1;
  const halfYear = 86400 * 180;
  const year = 86400 * 365;

  const tokensOnAccount = 10 * (10 ** DECIMALS);
  const changeAllowedAmount = 5 * (10 ** DECIMALS);
  const transferAllowedAmount = 4 * (10 ** DECIMALS);
  const amountForBurn = 2e6 * (10 ** DECIMALS);
  const wrongAmountForBurn = 3e6 * (10 ** DECIMALS);

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

      const balanceOwner = (await this.token.balanceOf(owner)).toNumber();
      assertEqual(balanceOwner, AMOUNT_TOKENS_FOR_SELL);

      const balanceContract = (await this.token.balanceOf(this.token.address)).toNumber();
      assertEqual(balanceContract, RESERVED_TOTAL);
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

    it('should allow to reserve funds', async function () {
      // when
      await this.token.reserveFunds(
        reserveFundsAddress,
        { from: owner },
      );

      // then
      const balance = (await this.token.balanceOf(reserveFundsAddress)).toNumber();
      assertEqual(RESERVE_FUND, balance);
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

    it('should send reserve for investor with freeze', async function () {
      // when
      await this.token.sendWithFreeze(
        investorAddress,
        amountForInvestor,
        halfYear,
        { from: owner },
      );

      // then
      const balance = (await this.token.balanceOf(investorAddress)).toNumber();
      assertEqual(0, balance);

      const lockedAddress = await this.token.getLockedContract(investorAddress);
      const lockedBalance = (await this.token.balanceOf(lockedAddress)).toNumber();
      assertEqual(amountForInvestor, lockedBalance);
    });

    it('should unlock tokens for team member', async function () {
      // when
      await this.token.reserveForTeam(
        reserveTeamAddress,
        amountForTeam,
        day,
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

      await timeController.addDays(day * 2);

      await this.token.unlockTokens(reserveTeamAddress, { from: notOwner });

      balance = (await this.token.balanceOf(reserveTeamAddress)).toNumber();
      assertEqual(amountForTeam, balance);

      lockedAddress = await this.token.getLockedContract(reserveTeamAddress);
      lockedBalance = (await this.token.balanceOf(lockedAddress)).toNumber();
      assertEqual(0, lockedBalance);
    });

    it('should unlock tokens for investor', async function () {
      // when
      await this.token.sendWithFreeze(
        investorAddress,
        amountForInvestor,
        halfYear,
        { from: owner },
      );

      // then
      let balance = (await this.token.balanceOf(investorAddress)).toNumber();
      assertEqual(0, balance);

      let lockedAddress = await this.token.getLockedContract(investorAddress);
      let lockedBalance = (await this.token.balanceOf(lockedAddress)).toNumber();
      assertEqual(amountForInvestor, lockedBalance);

      await timeController.addSeconds(year);

      await this.token.unlockTokens(investorAddress, { from: notOwner });

      balance = (await this.token.balanceOf(investorAddress)).toNumber();
      assertEqual(amountForInvestor, balance);

      lockedAddress = await this.token.getLockedContract(investorAddress);
      lockedBalance = (await this.token.balanceOf(lockedAddress)).toNumber();
      assertEqual(0, lockedBalance);
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

    it('should reject request for set burn address if caller is not an owner', async function () {
      // when
      const setBurnAddress = this.token.setBurnAddress(
        burnAddress,
        { from: notOwner },
      );

      // then
      await setBurnAddress.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for set burn address if owner uses wrong address', async function () {
      // when
      const setBurnAddress = this.token.setBurnAddress(
        0x0,
        { from: owner },
      );

      // then
      await setBurnAddress.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for reserve funds if caller is not an owner', async function () {
      // when
      const reserveFunds = this.token.reserveFunds(
        reserveFundsAddress,
        { from: notOwner },
      );

      // then
      await reserveFunds.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for reserve funds if owner uses wrong address', async function () {
      // when
      const reserveFunds = this.token.reserveFunds(
        0x0,
        { from: owner },
      );

      // then
      await reserveFunds.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for reserve funds if this already done', async function () {
      // given
      await this.token.reserveFunds(
        reserveFundsAddress,
        { from: owner },
      );

      // when
      const reserveFunds = this.token.reserveFunds(
        reserveFundsAddress,
        { from: owner },
      );

      // then
      await reserveFunds.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for reserve for team if caller is not an owner', async function () {
      // when
      const reserveForTeam = this.token.reserveForTeam(
        reserveTeamAddress,
        amountForTeam,
        notFreeze,
        { from: notOwner },
      );

      // then
      await reserveForTeam.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for reserve for team if owner uses wrong address', async function () {
      // when
      const reserveForTeam = this.token.reserveForTeam(
        0x0,
        amountForTeam,
        notFreeze,
        { from: owner },
      );

      // then
      await reserveForTeam.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for reserve for team if owner uses wrong amount', async function () {
      // given
      await this.token.reserveForTeam(
        reserveTeamAddress,
        amountForTeam,
        notFreeze,
        { from: owner },
      );

      // when
      const reserveForTeam = this.token.reserveForTeam(
        reserveTeamAddress,
        wrongAmountForTeam,
        notFreeze,
        { from: owner },
      );

      // then
      await reserveForTeam.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for reserve for investor if owner uses wrong address', async function () {
      // when
      const reserveForInvestor = this.token.sendWithFreeze(
        0x0,
        amountForInvestor,
        halfYear,
        { from: owner },
      );

      // then
      await reserveForInvestor.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for reserve for investor if owner uses zero amount', async function () {
      // when
      const reserveForInvestor = this.token.sendWithFreeze(
        investorAddress,
        0,
        halfYear,
        { from: owner },
      );

      // then
      await reserveForInvestor.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for reserve for investor if owner uses zero time as freeze period', async function () {
      // when
      const reserveForInvestor = this.token.sendWithFreeze(
        investorAddress,
        amountForInvestor,
        0,
        { from: owner },
      );

      // then
      await reserveForInvestor.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for burn tokens if caller is not an owner', async function () {
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

    it('should reject request for burn tokens if owner uses zero amount', async function () {
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

      // when
      const burnFromAddress = this.token.burnFromAddress(
        0,
        { from: owner },
      );

      // then
      await burnFromAddress.should.be.rejectedWith(EVMThrow);

      const balance = (await this.token.balanceOf(burnAddress)).toNumber();
      assertEqual(amountForBurn, balance);
    });

    it('should reject request for burn tokens if owner uses wrong amount', async function () {
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

      // when
      const burnFromAddress = this.token.burnFromAddress(
        wrongAmountForBurn,
        { from: owner },
      );

      // then
      await burnFromAddress.should.be.rejectedWith(EVMThrow);

      const balance = (await this.token.balanceOf(burnAddress)).toNumber();
      assertEqual(amountForBurn, balance);
    });
  });
});
