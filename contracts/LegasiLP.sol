// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LpToken is ERC20 {
    address public pool;
    constructor(string memory name_, string memory symbol_, address _pool) ERC20(name_, symbol_) {
        pool = _pool;
    }
    function mint(address to, uint256 amount) external {
        require(msg.sender == pool, "only pool");
        _mint(to, amount);
    }
    function burn(address from, uint256 amount) external {
        require(msg.sender == pool, "only pool");
        _burn(from, amount);
    }
}

contract LegasiLP {
    IERC20 public asset;
    LpToken public lpToken;

    uint256 public totalDeposits;
    uint256 public totalShares;

    event LpDeposit(address indexed user, uint256 amount, uint256 shares);
    event LpWithdraw(address indexed user, uint256 amount, uint256 shares);

    constructor(address asset_, string memory name_, string memory symbol_) {
        asset = IERC20(asset_);
        lpToken = new LpToken(name_, symbol_, address(this));
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "amount");
        asset.transferFrom(msg.sender, address(this), amount);
        uint256 shares = totalShares == 0 ? amount : (amount * totalShares) / totalDeposits;
        require(shares > 0, "shares");
        totalDeposits += amount;
        totalShares += shares;
        lpToken.mint(msg.sender, shares);
        emit LpDeposit(msg.sender, amount, shares);
    }

    function withdraw(uint256 shares) external {
        require(shares > 0, "shares");
        uint256 amount = (shares * totalDeposits) / totalShares;
        lpToken.burn(msg.sender, shares);
        totalShares -= shares;
        totalDeposits -= amount;
        asset.transfer(msg.sender, amount);
        emit LpWithdraw(msg.sender, amount, shares);
    }
}
