import { EVMThrow, assertEqual } from './utils';

const SaifuToken = artifacts.require('SaifuToken');

contract('SaifuToken', (wallets) => {
  const owner = wallets[0];
  const notOwner = wallets[1];
  const newOwner = wallets[2];

  beforeEach(async function () {
    // given
    this.token = await SaifuToken.new();
  });

  describe('Ownable token tests', () => {
    it('should set token creator as owner', async function () {
      // then
      const tokenOwner = await this.token.owner();
      assertEqual(tokenOwner, owner);
    });

    it('should transfer ownership to another account', async function () {
      // when
      await this.token.transferOwnership(newOwner, { from: owner });

      // then
      const tokenOwner = await this.token.owner();
      assertEqual(tokenOwner, newOwner);
    });

    it('should reject the request for transfer ownership if sender is not an owner', async function () {
      // when
      const transferOwnership = this.token.transferOwnership(newOwner, { from: notOwner });

      // then
      await transferOwnership.should.be.rejectedWith(EVMThrow);

      const tokenOwner = await this.token.owner();
      assertEqual(tokenOwner, owner);
    });
  });
});
