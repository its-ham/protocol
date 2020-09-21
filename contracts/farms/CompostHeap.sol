pragma solidity ^0.5.17;

import "./Farm.sol";
import "../lib/IUniswapV2Router02.sol";

contract CompostHeap is Farm {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    mapping(address => bool) public acceptedTokens;
    IUniswapV2Router02 public uniswapRouter;

    event Sold(address indexed user, address indexed token, uint256 amount);
    event Staked(address indexed user, uint256 amount);

    constructor(
        IERC20 _ham,
        IERC20[] memory _acceptedTokens,
        IERC20 _tokenToBuy,
        IUniswapV2Router02 _uniswapRouter
    ) Farm(_ham, _tokenToBuy) public {
        uniswapRouter = _uniswapRouter;
        for (uint i = 0; i<_acceptedTokens.length; i++) {
            acceptedTokens[address(_acceptedTokens[i])] = true;
        }
    }

    function stakeAndSell(IERC20 token, uint256 amount) public checkStart {
        require(amount > 0, "can't stake 0");
        require(acceptedTokens[address(token)], "token not accepted");
        token.safeTransferFrom(msg.sender, address(this), amount);
        require(token.approve(address(uniswapRouter), amount), 'approve failed.');
        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = address(wrappedToken);

        uint256 balance = wrappedToken.balanceOf(address(this));

        uniswapRouter.swapExactTokensForTokens(amount, 0, path, address(this), block.timestamp);

        uint256 amountBought = wrappedToken.balanceOf(address(this)).sub(balance);

        _balances[msg.sender] = _balances[msg.sender].add(amountBought);
        _totalSupply = _totalSupply.add(amountBought);

        emit Sold(msg.sender, address(token), amount);
        emit Staked(msg.sender, amountBought);
    }

    function stake(uint256 amount) public {
        revert("cant stake without selling");
    }
}
