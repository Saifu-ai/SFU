import { timeController, duration } from './utils';

const SaifuToken = artifacts.require('SaifuToken');
const TokenTimelock = artifacts.require('TokenTimelock');
// eslint-disable-next-line
contract('TokenTimelock', ([_, owner, beneficiary]) => {
  const amount = 1e6 * 10e18;

  beforeEach(async function () {
    this.token = await SaifuToken.new({ from: owner });
    this.releaseTime = timeController.latestTime() + duration.years(1);
    this.timelock = await TokenTimelock.new(this.token.address, beneficiary, this.releaseTime);
    await this.token.transfer(this.timelock.address, amount, { from: owner });
  });

  it('cannot be released before time limit', async function () {
    await this.timelock.release().should.be.rejected;
  });

  it('cannot be released just before time limit', async function () {
    await timeController.increaseTimeTo(this.releaseTime - duration.seconds(3));
    await this.timelock.release().should.be.rejected;
  });

  it('can be released just after limit', async function () {
    await timeController.increaseTimeTo(this.releaseTime + duration.seconds(1));
    await this.timelock.release().should.be.fulfilled;
    const balance = await this.token.balanceOf(beneficiary);
    balance.should.be.bignumber.equal(amount);
  });

  it('can be released after time limit', async function () {
    await timeController.increaseTimeTo(this.releaseTime + duration.years(1));
    await this.timelock.release().should.be.fulfilled;
    const balance = await this.token.balanceOf(beneficiary);
    balance.should.be.bignumber.equal(amount);
  });

  it('cannot be released twice', async function () {
    await timeController.increaseTimeTo(this.releaseTime + duration.years(1));
    await this.timelock.release().should.be.fulfilled;
    await this.timelock.release().should.be.rejected;
    const balance = await this.token.balanceOf(beneficiary);
    balance.should.be.bignumber.equal(amount);
  });
});
