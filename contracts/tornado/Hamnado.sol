pragma solidity ^0.5.17;

import "./ERC20Tornado.sol";
import "../lib/SafeMath.sol";
import "../token/HAMTokenInterface.sol";

contract Hamnado is ERC20Tornado {
  using SafeMath for uint256;

  uint256 public deposits;

  constructor(
    IVerifier _verifier,
    uint256 _denomination,
    uint32 _merkleTreeHeight,
    address _operator,
    address _token
  ) ERC20Tornado(_verifier, _denomination, _merkleTreeHeight, _operator, _token) public {
    (bool success,) = _token.call(abi.encodeWithSignature("hamsScalingFactor()"));
    require(success, "need hamsScalingFactor");
    (success,) = _token.call(abi.encodeWithSignature("initSupply()"));
    require(success, "need initSupply");
  }

  function scaledDenomination() public view returns (uint256) {
    return denomination.mul(HAMTokenInterface(token).totalSupply()).div(HAMTokenInterface(token).initSupply());
  }

  function _processDeposit() internal {
    require(msg.value == 0, "ETH value is supposed to be 0 for ERC20 instance");

    _safeErc20TransferFrom(msg.sender, address(this), scaledDenomination());

    deposits = deposits.add(1);
  }

  function _processWithdraw(address payable _recipient, address payable _relayer, uint256 _fee, uint256 _refund) internal {
    require(msg.value == _refund, "Incorrect refund amount received by the contract");

    uint256 withdrawalDenom = HAMTokenInterface(token).balanceOf(address(this)).div(deposits);

    _safeErc20Transfer(_recipient, withdrawalDenom.sub(_fee));

    if (_fee > 0) {
      _safeErc20Transfer(_relayer, _fee);
    }

    if (_refund > 0) {
      (bool success, ) = _recipient.call.value(_refund)("");
      if (!success) {
        // let's return _refund back to the relayer
        _relayer.transfer(_refund);
      }
    }

    deposits = deposits.sub(1);
  }
}
