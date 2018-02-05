import { EVMThrow, assertTrue, assertFalse } from './utils';

const SaifuToken = artifacts.require('SaifuToken');

contract('SaifuToken', (wallets) => {
  const owner = wallets[0];
  const notOwner = wallets[1];
  const walletOne = wallets[2];

  beforeEach(async function () {
    // given
    this.token = await SaifuToken.new();
  });

  describe('Freezable token tests', () => {
    it('should add wallets to the frozenlist', async function () {
      // when
      await this.token.freezeAccount(walletOne, { from: owner });

      // then
      const walletOneAfterAdd = await this.token.isFrozen(walletOne);
      assertTrue(walletOneAfterAdd);
    });

    it('should reject request for add wallet to the frozenlist if sender uses 0x0 address as a wallet', async function () {
      // when
      const frozenlist = this.token.freezeAccount(0x0, { from: owner });

      // then
      await frozenlist.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for add wallet to the frozenlist if sender is not an owner', async function () {
      // when
      const frozenlist = this.token.freezeAccount(walletOne, { from: notOwner });

      // then
      await frozenlist.should.be.rejectedWith(EVMThrow);

      const walletOneAfterReject = await this.token.isFrozen(walletOne);
      assertFalse(walletOneAfterReject);
    });

    it('should remove wallets from the frozenlist', async function () {
      // given
      await this.token.freezeAccount(walletOne, { from: owner });

      // when
      await this.token.unfreezeAccount(walletOne, { from: owner });

      // then
      const walletOneAfterRemove = await this.token.isFrozen(walletOne);
      assertFalse(walletOneAfterRemove);
    });

    it('should reject request for remove wallet from the frozenlist if sender uses 0x0 address as a wallet', async function () {
      // when
      const frozenlist = this.token.unfreezeAccount(0x0, { from: owner });

      // then
      await frozenlist.should.be.rejectedWith(EVMThrow);
    });

    it('should reject request for remove wallet from the frozenlist if sender is not an owner', async function () {
      // given
      await this.token.freezeAccount(walletOne, { from: owner });

      // when
      const frozenlist = this.token.unfreezeAccount(walletOne, { from: notOwner });

      // then
      await frozenlist.should.be.rejectedWith(EVMThrow);

      const walletOneAfterReject = await this.token.isFrozen(walletOne);
      assertTrue(walletOneAfterReject);
    });
  });
});
