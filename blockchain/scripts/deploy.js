/**
 * deploy.js — Micro-Earth DynamicAssetAMM Deployment
 *
 * Liquidity bootstrap: 10 DYNA : 500 MUSD  =>  price = 50 MUSD/DYNA
 *
 * Wallets:
 *   accounts[0]  = deployer / liquidity provider
 *   accounts[1..10] = entity wallets (each gets 2 DYNA + 100 MUSD)
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, ...entities] = await ethers.getSigners();

  console.log("[deploy] Deployer:", deployer.address);
  console.log("[deploy] Entity wallets:", entities.length);

  // ── 1. Deploy tokens ──────────────────────────────────────
  const DynAssetToken = await ethers.getContractFactory("DynAssetToken");
  const dynAsset = await DynAssetToken.deploy(deployer.address);
  await dynAsset.waitForDeployment();
  console.log("[deploy] DynAssetToken deployed:", await dynAsset.getAddress());

  const StableCoin = await ethers.getContractFactory("StableCoin");
  const stableCoin = await StableCoin.deploy(deployer.address);
  await stableCoin.waitForDeployment();
  console.log("[deploy] StableCoin deployed:", await stableCoin.getAddress());

  // ── 2. Deploy AMM ─────────────────────────────────────────
  const DynamicAssetAMM = await ethers.getContractFactory("DynamicAssetAMM");
  const amm = await DynamicAssetAMM.deploy(
    await dynAsset.getAddress(),
    await stableCoin.getAddress(),
    deployer.address
  );
  await amm.waitForDeployment();
  console.log("[deploy] DynamicAssetAMM deployed:", await amm.getAddress());

  const dec = 18n;
  const ONE = 10n ** dec;

  // ── 3. Mint initial supply to deployer ────────────────────
  // Pool: 10 DYNA + 500 MUSD
  // Entities (up to 10): 2 DYNA + 100 MUSD each
  const entityCount = Math.min(entities.length, 10);
  const totalDyna   = 10n * ONE + BigInt(entityCount) * 2n * ONE;   // pool + entities
  const totalMusd   = 500n * ONE + BigInt(entityCount) * 100n * ONE;

  await dynAsset.mint(deployer.address, totalDyna);
  await stableCoin.mint(deployer.address, totalMusd);
  console.log("[deploy] Minted", ethers.formatEther(totalDyna), "DYNA +", ethers.formatEther(totalMusd), "MUSD to deployer");

  // ── 4. Bootstrap liquidity: 10 DYNA : 500 MUSD ───────────
  //       Initial price = 500 / 10 = 50 MUSD per DYNA
  const ammAddress = await amm.getAddress();
  await dynAsset.approve(ammAddress, 10n * ONE);
  await stableCoin.approve(ammAddress, 500n * ONE);
  await amm.addLiquidity(10n * ONE, 500n * ONE);

  const initialPrice = await amm.spotPrice();
  console.log("[deploy] Pool bootstrapped | reserveAsset=10 DYNA | reserveStable=500 MUSD");
  console.log("[deploy] Initial spot price:", ethers.formatEther(initialPrice), "MUSD/DYNA");

  // ── 5. Distribute entity wallets ─────────────────────────
  for (let i = 0; i < entityCount; i++) {
    const wallet = entities[i].address;
    await dynAsset.transfer(wallet, 2n * ONE);
    await stableCoin.transfer(wallet, 100n * ONE);
    console.log(`[deploy] Entity #${String(i+1).padStart(3,"0")} wallet=${wallet.slice(0,10)}... | +2 DYNA +100 MUSD`);
  }

  // ── 6. Write deployment info to JSON ─────────────────────
  const deployment = {
    chainId:           31337,
    deployedAt:        new Date().toISOString(),
    deployer:          deployer.address,
    contracts: {
      DynAssetToken:    await dynAsset.getAddress(),
      StableCoin:       await stableCoin.getAddress(),
      DynamicAssetAMM:  await amm.getAddress(),
    },
    pool: {
      initialDyna:   "10.0",
      initialMusd:   "500.0",
      initialPrice:  "50.0",
      kInvariant:    "5000.0",
    },
    entityWallets: entities.slice(0, entityCount).map((e, i) => ({
      index:    i + 1,
      address:  e.address,
      dyna:     "2.0",
      musd:     "100.0",
    })),
  };

  const outPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log("[deploy] Deployment info saved to blockchain/deployment.json");
  console.log("[deploy] Done. AMM ready for entity panic-sell simulations.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
