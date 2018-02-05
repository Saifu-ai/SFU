pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

import "./FreezableToken.sol";


contract SaifuToken is StandardToken, FreezableToken {
    using SafeMath for uint256;

    string constant public name = "Saifu";
    string constant public symbol = "SFU";
    uint8 constant public decimals = 18;

    uint256 constant public INITIAL_TOTAL_SUPPLY = 200e6 * (uint256(10) ** decimals);
    uint256 constant public RESERVED_FOR_FUNDS = 20e6 * (uint256(10) ** decimals);
    uint256 constant public RESERVED_FOR_TEAM = 50e6 * (uint256(10) ** decimals);
    
    uint256 public alreadyReservedForTeam = 0;

    bool private isReservedFundsDone = false;

    address private burnAddress;

    /**
    * @dev Create SaifuToken contract
    */
    function SaifuToken() public {
        totalSupply_ = totalSupply_.add(INITIAL_TOTAL_SUPPLY);
        balances[owner] = balances[owner].add(INITIAL_TOTAL_SUPPLY);
        Transfer(address(0), owner, INITIAL_TOTAL_SUPPLY);
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
        burnAddress = _address;
    }

    /**
    * @dev Get burn address.
    */
    function getBurnAddress() onlyOwner public view returns (address) {
        return burnAddress;
    }

    /**
    * @dev Reserve funds.
    * @param _address the address for reserve funds. 
    */
    function reserveFunds(address _address) onlyOwner public {
        require(!isReservedFundsDone);

        transfer(_address, RESERVED_FOR_FUNDS);

        isReservedFundsDone = true;
    }

    /**
    * @dev Reserve for team.
    * @param _address the address for reserve. 
    * @param _amount the specified amount for reserve. 
    */
    function reserveForTeam(address _address, uint256 _amount) onlyOwner public {
        require(_amount <= RESERVED_FOR_TEAM.sub(alreadyReservedForTeam));
        
        transfer(_address, _amount);

        alreadyReservedForTeam = alreadyReservedForTeam.add(_amount);
    }

    /**
    * @dev Burn a specific amount of tokens.
    * @param _amount The Amount of tokens.
    */
    function burnFromAddress(uint256 _amount) onlyOwner public {
        require(_amount > 0);
        require(_amount <= balances[burnAddress]);

        balances[burnAddress] = balances[burnAddress].sub(_amount);
        totalSupply_ = totalSupply_.sub(_amount);
        Transfer(burnAddress, address(0), _amount);
    }
}
