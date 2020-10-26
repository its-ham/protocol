import "./Farm.sol";

contract Incentivizer is Farm {
    uint256 public initSupplyReward;
    address public minter;

    constructor(
        IERC20 _ham,
        IERC20 _wrappedToken,
        uint256 _initSupplyReward
    ) Farm(_ham, _wrappedToken) public {
        initSupplyReward = _initSupplyReward;
    }

    function initialize(address _minter, uint256 _startTime, uint256 _duration)
        public onlyOwner
    {
        minter = _minter;
        super.initialize(_startTime, _duration);
    }
    function getReward() public checkHalve {
        super.getReward();
    }

    function mintHAM(uint256 amount) internal {
        address targetMinter;
        if (minter != address(0)) {
            targetMinter = minter;
        } else {
            targetMinter = address(ham);
        }
        HAM(targetMinter).mint(address(this), amount);
    }

    modifier checkHalve() {
        if (block.timestamp >= periodFinish) {
            initSupplyReward = initSupplyReward.mul(50).div(100);
            uint256 scalingFactor = HAM(address(ham)).hamsScalingFactor();
            uint256 newRewards = initSupplyReward.mul(scalingFactor).div(10**18);
            mintHAM(newRewards);
            rewardRate = initSupplyReward.div(duration);
            periodFinish = block.timestamp.add(duration);
            emit RewardAdded(initSupplyReward);
        }
        _;
    }

    function notifyRewardAmount(uint256 reward)
        public
        onlyRewardDistribution
        updateReward(address(0))
    {
        super.notifyRewardAmount(reward);
        if (block.timestamp <= startTime) {
          require(ham.balanceOf(address(this)) == 0, "already initialized");
          mintHAM(initSupplyReward);
        }
    }

    // This function allows governance to take unsupported tokens out of the
    // contract, since this one exists longer than the other pools.
    // This is in an effort to make someone whole, should they seriously
    // mess up. There is no guarantee governance will vote to return these.
    // It also allows for removal of airdropped tokens.
    function governanceRecoverUnsupported(IERC20 _token, uint256 amount, address to)
        external
    {
        // only gov
        require(msg.sender == owner(), "!governance");
        // cant take staked asset
        require(_token != wrappedToken, "staked token");
        // cant take reward asset
        require(_token != ham, "ham");

        // transfer to
        _token.safeTransfer(to, amount);
    }
}
