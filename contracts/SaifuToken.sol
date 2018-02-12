pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

import "./FreezableToken.sol";
import "./TokenTimelock.sol";


contract SaifuToken is StandardToken, FreezableToken {
    using SafeMath for uint256;

    string constant public name = "Saifu";
    string constant public symbol = "SFU";
    uint8 constant public decimals = 18;

    uint256 constant public INITIAL_TOTAL_SUPPLY = 200e6 * (uint256(10) ** decimals);
    uint256 constant public AMOUNT_TOKENS_FOR_SELL = 130e6 * (uint256(10) ** decimals);

    uint256 constant public RESERVE_FUND = 20e6 * (uint256(10) ** decimals);
    uint256 constant public RESERVED_FOR_TEAM = 50e6 * (uint256(10) ** decimals);

    uint256 constant public RESERVED_TOTAL_AMOUNT = 70e6 * (uint256(10) ** decimals);
    
    uint256 public alreadyReservedForTeam = 0;

    bool private isReservedFundsDone = false;

    address public burnAddress;

    uint256 private setBurnAddressCount = 0;

    // Key: address of wallet, Value: address of contract.
    mapping (address => address) private lockedList;

    /**
    * @dev Throws if called by any account other than the burnable account.
    */
    modifier onlyBurnAddress() {
        require(msg.sender == burnAddress);
        _;
    }

    /**
    * @dev Create SaifuToken contract
    */
    function SaifuToken() public {
        totalSupply_ = totalSupply_.add(INITIAL_TOTAL_SUPPLY);

        balances[owner] = balances[owner].add(AMOUNT_TOKENS_FOR_SELL);
        Transfer(address(0), owner, AMOUNT_TOKENS_FOR_SELL);

        balances[this] = balances[this].add(RESERVED_TOTAL_AMOUNT);
        Transfer(address(0), this, RESERVED_TOTAL_AMOUNT);
    }

     /**
    * @dev Transfer token for a specified address.
    * @dev Only applies when the transfer is allowed by the owner.
    * @param _to The address to transfer to.
    * @param _value The amount to be transferred.
    */
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(!isFrozen(msg.sender));
        super.transfer(_to, _value);
    }

    /**
    * @dev Transfer tokens from one address to another.
    * @dev Only applies when the transfer is allowed by the owner.
    * @param _from address The address which you want to send tokens from
    * @param _to address The address which you want to transfer to
    * @param _value uint256 the amount of tokens to be transferred
    */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(!isFrozen(msg.sender));
        require(!isFrozen(_from));
        super.transferFrom(_from, _to, _value);
    }

    /**
    * @dev Set burn address.
    * @param _address New burn address
    */
    function setBurnAddress(address _address) onlyOwner public {
        require(setBurnAddressCount < 3);
        require(_address != address(0));
        burnAddress = _address;
        setBurnAddressCount = setBurnAddressCount.add(1);
    }

    /**
    * @dev Reserve funds.
    * @param _address the address for reserve funds. 
    */
    function reserveFunds(address _address) onlyOwner public {
        require(_address != address(0));

        require(!isReservedFundsDone);

        sendFromContract(_address, RESERVE_FUND);
        
        isReservedFundsDone = true;
    }

    /**
    * @dev Get locked contract address.
    * @param _address the address of owner these tokens.
    */
    function getLockedContract(address _address) public view returns(address) {
        return lockedList[_address];
    }

    /**
    * @dev Reserve for team.
    * @param _address the address for reserve. 
    * @param _amount the specified amount for reserve. 
    * @param _time the specified freezing time (in days). 
    */
    function reserveForTeam(address _address, uint256 _amount, uint256  _time) onlyOwner public {
        require(_address != address(0));
        require(_amount > 0 && _amount <= RESERVED_FOR_TEAM.sub(alreadyReservedForTeam));

        if (_time > 0) {
            address lockedAddress = new TokenTimelock(this, _address, now.add(_time * 1 days));
            lockedList[_address] = lockedAddress;
            sendFromContract(lockedAddress, _amount);
        } else {
            sendFromContract(_address, _amount);
        }
        
        alreadyReservedForTeam = alreadyReservedForTeam.add(_amount);
    }

    /**
    * @dev Send tokens which will be frozen for specified time.
    * @param _address the address for send. 
    * @param _amount the specified amount for send. 
    * @param _time the specified freezing time (in seconds). 
    */
    function sendWithFreeze(address _address, uint256 _amount, uint256  _time) onlyOwner public {
        require(_address != address(0) && _amount > 0 && _time > 0);

        address lockedAddress = new TokenTimelock(this, _address, now.add(_time));
        lockedList[_address] = lockedAddress;
        transfer(lockedAddress, _amount);
    }

    /**
    * @dev Unlock frozen tokens.
    * @param _address the address for which to release already unlocked tokens. 
    */
    function unlockTokens(address _address) public {
        require(lockedList[_address] != address(0));

        TokenTimelock lockedContract = TokenTimelock(lockedList[_address]);

        lockedContract.release();
    }

    /**
    * @dev Burn a specific amount of tokens.
    * @param _amount The Amount of tokens.
    */
    function burnFromAddress(uint256 _amount) onlyBurnAddress public {
        require(_amount > 0);
        require(_amount <= balances[burnAddress]);

        balances[burnAddress] = balances[burnAddress].sub(_amount);
        totalSupply_ = totalSupply_.sub(_amount);
        Transfer(burnAddress, address(0), _amount);
    }

    /*
    * @dev Send tokens from contract.
    * @param _address the address destination. 
    * @param _amount the specified amount for send.
     */
    function sendFromContract(address _address, uint256 _amount) internal {
        balances[this] = balances[this].sub(_amount);
        balances[_address] = balances[_address].add(_amount);
        Transfer(this, _address, _amount);
    }
}
