"""
chain_amm.py  --  Micro-Earth On-Chain AMM Adapter  v1.0
=========================================================
Bridges Python physics / entity simulation to the DynamicAssetAMM
smart contract on a local Hardhat node (localhost:8545).

Degrades gracefully to simulated-hash mode when:
  - Hardhat node not running
  - deployment.json absent
  - web3 package not installed

All amounts use 18-decimal integers on-chain; Python API uses plain floats.
"""

import os
import json
import math
import time
import hashlib
import random
import logging
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

_DEPLOY_JSON  = (
    Path(__file__).parent.parent.parent
    / "blockchain" / "deployment.json"
)
_ARTIFACTS_DIR = (
    Path(__file__).parent.parent.parent
    / "blockchain" / "artifacts" / "contracts"
    / "DynamicAssetAMM.sol"
)

_w3            = None
_amm           = None
_dyna          = None
_deployment    = None
_entity_accts: Dict[int, Any] = {}
_chain_mode    = False

ONE = 10 ** 18


def _load_abi(name: str):
    p = _ARTIFACTS_DIR / f"{name}.json"
    if p.exists():
        return json.loads(p.read_text())["abi"]
    return []


def _init_chain():
    global _w3, _amm, _dyna, _deployment, _entity_accts, _chain_mode
    if _chain_mode:
        return True
    try:
        from web3 import Web3
        from web3.middleware import ExtraDataToPOAMiddleware

        if not _DEPLOY_JSON.exists():
            return False

        _deployment = json.loads(_DEPLOY_JSON.read_text())
        rpc = "http://127.0.0.1:8545"
        w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 3}))
        if not w3.is_connected():
            return False

        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        amm_abi  = _load_abi("DynamicAssetAMM")
        dyna_abi = _load_abi("DynAssetToken")

        amm_addr  = _deployment["contracts"]["DynamicAssetAMM"]
        dyna_addr = _deployment["contracts"]["DynAssetToken"]

        _amm  = w3.eth.contract(address=amm_addr,  abi=amm_abi)
        _dyna = w3.eth.contract(address=dyna_addr, abi=dyna_abi)
        _w3   = w3

        # Map entity wallets
        for ew in _deployment.get("entityWallets", []):
            idx = ew["index"]
            addr = ew["address"]
            # Hardhat default accounts have unlocked keys; use from_key workaround
            # In local node mode, eth_sendTransaction works without private key
            _entity_accts[idx] = addr

        _chain_mode = True
        logger.info("[ChainAMM] Connected to Hardhat node at %s", rpc)
        return True
    except Exception as e:
        logger.debug("[ChainAMM] Chain init failed (graceful fallback): %s", e)
        return False


# ── AMM state query ─────────────────────────────────────────────────────────

def get_amm_state() -> Dict[str, float]:
    """
    Return current AMM state: reserveAsset, reserveStable, spotPrice.
    Falls back to in-memory simulation values when chain is unavailable.
    """
    if _chain_mode and _amm:
        try:
            ra  = _amm.functions.reserveAsset().call()
            rs  = _amm.functions.reserveStable().call()
            sp  = _amm.functions.spotPrice().call()
            return {
                "reserve_asset":  ra  / ONE,
                "reserve_stable": rs  / ONE,
                "spot_price":     sp  / ONE,
                "chain_mode":     True,
            }
        except Exception as e:
            logger.warning("[ChainAMM] get_amm_state error: %s", e)

    # Fallback: return simulated values from entity_simulator
    from agents.entity_simulator import amm_price, _amm_asset, _amm_stable
    return {
        "reserve_asset":  _amm_asset,
        "reserve_stable": _amm_stable,
        "spot_price":     amm_price(),
        "chain_mode":     False,
    }


# ── Panic sell ──────────────────────────────────────────────────────────────

def swap_panic_sell(entity_id: int, asset_amount: float) -> Dict[str, Any]:
    """
    Execute a panic-sell swap for a Kinetic Entity.

    1. Try to call panicSell() on the on-chain AMM contract.
    2. If chain unavailable, fall back to in-memory AMM + simulated tx_hash.

    Returns dict with:
      tx_hash    -- on-chain or simulated 0x... hash
      amm_price  -- new spot price after swap
      stable_out -- MUSD received
      chain_mode -- bool: True = real tx, False = simulated
    """
    _init_chain()
    amount_wei = int(asset_amount * ONE)
    ts = time.strftime("%H:%M:%S")

    if _chain_mode and _amm and _dyna and _w3:
        try:
            entity_wallet = _entity_accts.get(
                (entity_id % len(_entity_accts)) + 1 if _entity_accts else 1
            )
            if entity_wallet is None:
                raise ValueError("no entity wallet")

            # Approve AMM to spend DYNA from entity wallet
            amm_addr = _deployment["contracts"]["DynamicAssetAMM"]
            tx_approve = _dyna.functions.approve(amm_addr, amount_wei).build_transaction({
                "from":  entity_wallet,
                "nonce": _w3.eth.get_transaction_count(entity_wallet),
                "gas":   100_000,
            })
            _w3.eth.send_transaction(tx_approve)  # unlocked in Hardhat

            # panicSell
            tx = _amm.functions.panicSell(
                entity_id, amount_wei
            ).build_transaction({
                "from":  entity_wallet,
                "nonce": _w3.eth.get_transaction_count(entity_wallet),
                "gas":   200_000,
            })
            receipt = _w3.eth.send_transaction(tx)
            tx_receipt = _w3.eth.wait_for_transaction_receipt(receipt, timeout=10)

            new_price = _amm.functions.spotPrice().call() / ONE
            return {
                "tx_hash":    tx_receipt["transactionHash"].hex(),
                "amm_price":  round(new_price, 4),
                "stable_out": round(asset_amount * new_price, 4),
                "chain_mode": True,
            }
        except Exception as e:
            logger.warning("[ChainAMM] panicSell on-chain failed, falling back: %s", e)

    # ── Simulated fallback ──────────────────────────────────────────────────
    from agents.entity_simulator import amm_swap_asset_for_stable, amm_price
    stable_out = amm_swap_asset_for_stable(asset_amount)
    cur_price  = amm_price()
    raw = f"{entity_id}:{ts}:{cur_price:.6f}:{random.random()}"
    tx_hash = "0x" + hashlib.sha256(raw.encode()).hexdigest()
    return {
        "tx_hash":    tx_hash,
        "amm_price":  round(cur_price, 4),
        "stable_out": round(stable_out, 4),
        "chain_mode": False,
    }


# ── Startup probe ────────────────────────────────────────────────────────────

def probe() -> str:
    ok = _init_chain()
    if ok:
        state = get_amm_state()
        return (
            f"[ChainAMM] ON-CHAIN mode | "
            f"reserveAsset={state['reserve_asset']:.2f} DYNA | "
            f"reserveStable={state['reserve_stable']:.2f} MUSD | "
            f"price={state['spot_price']:.4f} MUSD/DYNA"
        )
    return "[ChainAMM] SIMULATED mode (Hardhat node not detected)"
