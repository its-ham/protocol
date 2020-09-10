import "./Farm.sol";

contract HAMIncentivizer is Farm {
    uint256 public initReward = 15 * 10**5 * 10**18; // 1.5m

    constructor(
        IERC20 _ham,
        uint256 _startTime,
        uint256 _duration
    ) Farm(_ham, IERC20(address(0)), _startTime, _duration) public {}

    function getReward() public checkHalve {
        super.getReward();
    }

    modifier checkHalve() {
        if (block.timestamp >= periodFinish) {
            initReward = initReward.mul(50).div(100);
            uint256 scalingFactor = HAM(address(ham)).hamsScalingFactor();
            uint256 newRewards = initReward.mul(scalingFactor).div(10**18);
            HAM(address(ham)).mint(address(this), newRewards);

            rewardRate = initReward.div(duration);
            periodFinish = block.timestamp.add(duration);
            emit RewardAdded(initReward);
        }
        _;
    }

    modifier checkStart(){
        require(block.timestamp >= startTime,"not start");
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
          HAM(address(ham)).mint(address(this), initReward);
        }
    }

    function setWrappedToken(IERC20 _wrappedToken) public {
        // only gov
        require(msg.sender == owner(), "!governance");
        // can only be set to non-zero once
        require(address(wrappedToken) == address(0), "already initialized");
        wrappedToken = _wrappedToken;
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
