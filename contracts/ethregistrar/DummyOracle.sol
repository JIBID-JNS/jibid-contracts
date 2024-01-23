pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DummyOracle is Ownable {
    int256 value;

    constructor(int256 _value) public {
        set(_value);
    }

    function set(int256 _value) public onlyOwner {
        value = _value;
    }

    function latestAnswer() public view returns (int256) {
        return value;
    }
}
