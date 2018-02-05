export { default as EVMThrow } from './EVMThrow';
export { default as timeController } from './timeController';
export * from './ether';
export * from './asserts';

const { BigNumber } = web3;
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();
