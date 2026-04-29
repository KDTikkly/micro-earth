// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ──────────────────────────────────────────────────────────────
//  DynAsset Token  (Dynamic Asset — represents a physical-world
//  asset whose value decays under extreme weather events)
// ──────────────────────────────────────────────────────────────
contract DynAssetToken is ERC20, Ownable {
    constructor(address initialOwner)
        ERC20("DynAsset", "DYNA")
        Ownable(initialOwner)
    {}

    /// @notice Mint tokens (only owner / deployer script)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

// ──────────────────────────────────────────────────────────────
//  StableCoin Token  (pegged 1:1 to USD, settlement currency)
// ──────────────────────────────────────────────────────────────
contract StableCoin is ERC20, Ownable {
    constructor(address initialOwner)
        ERC20("MicroEarth Stable", "MUSD")
        Ownable(initialOwner)
    {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

// ──────────────────────────────────────────────────────────────
//  DynamicAssetAMM  — Constant-product AMM  x * y = k
//
//  Initial liquidity:  10 DYNA  :  500 MUSD
//  => Initial price = 500 / 10 = 50 MUSD per DYNA
//
//  When a Kinetic Entity panics and dumps DYNA into the pool,
//  the price falls due to AMM slippage — producing real on-chain
//  price impact that the Analytics Dashboard reads back.
// ──────────────────────────────────────────────────────────────
contract DynamicAssetAMM is Ownable {

    DynAssetToken public immutable dynAsset;
    StableCoin    public immutable stableCoin;

    // Pool reserves — updated on every swap
    uint256 public reserveAsset;   // DYNA in pool
    uint256 public reserveStable;  // MUSD in pool
    uint256 public kLast;          // invariant snapshot (x * y)

    // Precision: all amounts use 18-decimal ERC-20 units
    uint256 public constant DECIMALS = 1e18;

    // ── Events ────────────────────────────────────────────────
    event LiquidityAdded(
        address indexed provider,
        uint256 assetAmount,
        uint256 stableAmount,
        uint256 newKLast
    );

    event SwapAssetForStable(
        address indexed trader,
        uint256 assetIn,
        uint256 stableOut,
        uint256 newPrice,   // scaled by 1e4 (i.e. price * 10000)
        uint256 kInvariant
    );

    event PanicSell(
        address indexed entity,
        uint256 entityId,
        uint256 assetIn,
        uint256 stableOut,
        uint256 newPrice
    );

    // ── Constructor ───────────────────────────────────────────
    constructor(
        address _dynAsset,
        address _stableCoin,
        address initialOwner
    ) Ownable(initialOwner) {
        dynAsset   = DynAssetToken(_dynAsset);
        stableCoin = StableCoin(_stableCoin);
    }

    // ── Liquidity ─────────────────────────────────────────────

    /**
     * @notice Add liquidity to the pool.
     *         On first call (bootstrap): must satisfy the 10:500 ratio
     *         to set the canonical initial price of 50 MUSD per DYNA.
     *
     * @param assetAmount   DYNA tokens to deposit (18-decimal)
     * @param stableAmount  MUSD tokens to deposit (18-decimal)
     */
    function addLiquidity(uint256 assetAmount, uint256 stableAmount)
        external
        onlyOwner
    {
        require(assetAmount > 0 && stableAmount > 0, "AMM: zero amount");

        dynAsset.transferFrom(msg.sender, address(this), assetAmount);
        stableCoin.transferFrom(msg.sender, address(this), stableAmount);

        reserveAsset  += assetAmount;
        reserveStable += stableAmount;
        kLast          = reserveAsset * reserveStable;

        emit LiquidityAdded(msg.sender, assetAmount, stableAmount, kLast);
    }

    // ── Price Query ───────────────────────────────────────────

    /**
     * @notice Current spot price of DYNA in MUSD (18-decimal fixed-point).
     *         price = reserveStable / reserveAsset
     */
    function spotPrice() public view returns (uint256) {
        if (reserveAsset == 0) return 0;
        return (reserveStable * DECIMALS) / reserveAsset;
    }

    /**
     * @notice Quote: how much MUSD you receive for selling `assetIn` DYNA.
     *         Uses constant-product formula:  dy = y - k / (x + dx)
     */
    function quoteAssetForStable(uint256 assetIn)
        public view returns (uint256 stableOut)
    {
        require(reserveAsset > 0, "AMM: empty pool");
        uint256 k = reserveAsset * reserveStable;
        uint256 newAsset = reserveAsset + assetIn;
        uint256 newStable = k / newAsset;
        stableOut = reserveStable > newStable ? reserveStable - newStable : 0;
    }

    // ── Swap ──────────────────────────────────────────────────

    /**
     * @notice Sell `assetIn` DYNA, receive MUSD.
     *         Any address (simulated entity wallet) can call this.
     *         Produces real on-chain slippage and price impact.
     */
    function swapAssetForStable(uint256 assetIn)
        external
        returns (uint256 stableOut)
    {
        require(assetIn > 0, "AMM: zero input");
        require(reserveAsset > 0, "AMM: pool not initialised");

        stableOut = quoteAssetForStable(assetIn);
        require(stableOut > 0, "AMM: insufficient output");

        dynAsset.transferFrom(msg.sender, address(this), assetIn);
        stableCoin.transfer(msg.sender, stableOut);

        reserveAsset  += assetIn;
        reserveStable -= stableOut;
        kLast          = reserveAsset * reserveStable;

        uint256 newPrice = spotPrice();
        emit SwapAssetForStable(msg.sender, assetIn, stableOut, newPrice / 1e14, kLast);
    }

    /**
     * @notice Convenience wrapper emitting PanicSell event with entity metadata.
     *         Called by the disaster simulation backend.
     */
    function panicSell(uint256 entityId, uint256 assetIn)
        external
        returns (uint256 stableOut)
    {
        require(assetIn > 0, "AMM: zero input");

        stableOut = quoteAssetForStable(assetIn);
        require(stableOut > 0, "AMM: insufficient output");

        dynAsset.transferFrom(msg.sender, address(this), assetIn);
        stableCoin.transfer(msg.sender, stableOut);

        reserveAsset  += assetIn;
        reserveStable -= stableOut;
        kLast          = reserveAsset * reserveStable;

        uint256 newPrice = spotPrice();
        emit PanicSell(msg.sender, entityId, assetIn, stableOut, newPrice);
    }

    // ── Emergency Drain (owner only) ─────────────────────────

    function drain() external onlyOwner {
        uint256 a = dynAsset.balanceOf(address(this));
        uint256 s = stableCoin.balanceOf(address(this));
        if (a > 0) dynAsset.transfer(owner(), a);
        if (s > 0) stableCoin.transfer(owner(), s);
        reserveAsset  = 0;
        reserveStable = 0;
        kLast         = 0;
    }
}
