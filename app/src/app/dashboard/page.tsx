"use client";

import { useState, useEffect, Suspense } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, useReadContract, usePublicClient } from "wagmi";
import { injected } from "wagmi/connectors";
import Link from "next/link";
import { parseUnits, formatUnits } from "viem";
import { CONTRACTS } from "@/lib/evmContracts";

// Toast
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm flex items-center gap-3 animate-slide-up ${
      type === "success" ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
    }`}>
      <span className="text-xl">{type === "success" ? "✅" : "❌"}</span>
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

// Wrapper for Suspense boundary
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <Dashboard />
    </Suspense>
  );
}

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#001520] text-white flex items-center justify-center">
      <div className="animate-pulse text-[#FF4E00]">Loading...</div>
    </div>
  );
}

const FALLBACK_PRICES = {
  WETH: 2600,
  WBTC: 45000,
  USDC: 1,
};

const lendingAbi = [
  { name: "initializePosition", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "configureAgent", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "dailyLimitUsd6", type: "uint256" },
    { name: "autoRepay", type: "bool" },
    { name: "x402", type: "bool" },
  ], outputs: [] },
  { name: "deposit", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ], outputs: [] },
  { name: "borrow", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ], outputs: [] },
  { name: "repay", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "amountUsd6", type: "uint256" },
  ], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ], outputs: [] },
  { name: "totalCollateralOf", type: "function", stateMutability: "view", inputs: [
    { name: "owner", type: "address" },
    { name: "token", type: "address" },
  ], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalBorrowOf", type: "function", stateMutability: "view", inputs: [
    { name: "owner", type: "address" },
    { name: "token", type: "address" },
  ], outputs: [{ name: "", type: "uint256" }] },
] as const;

const lpAbi = [
  { name: "deposit", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "amount", type: "uint256" },
  ], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "shares", type: "uint256" },
  ], outputs: [] },
  { name: "totalDeposits", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalShares", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const;

const erc20Abi = [
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "spender", type: "address" },
    { name: "amount", type: "uint256" },
  ], outputs: [{ name: "ok", type: "bool" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [
    { name: "owner", type: "address" },
  ], outputs: [{ name: "", type: "uint256" }] },
  { name: "mint", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
  ], outputs: [] },
] as const;

const coreAbi = [
  { name: "borrowableConfigs", type: "function", stateMutability: "view", inputs: [
    { name: "token", type: "address" },
  ], outputs: [
    { name: "isActive", type: "bool" },
    { name: "interestRateBps", type: "uint16" },
    { name: "decimals", type: "uint8" },
  ] },
  { name: "collateralConfigs", type: "function", stateMutability: "view", inputs: [
    { name: "token", type: "address" },
  ], outputs: [
    { name: "isActive", type: "bool" },
    { name: "maxLtvBps", type: "uint16" },
    { name: "liquidationThresholdBps", type: "uint16" },
    { name: "liquidationBonusBps", type: "uint16" },
    { name: "decimals", type: "uint8" },
  ] },
  { name: "priceFeeds", type: "function", stateMutability: "view", inputs: [
    { name: "token", type: "address" },
  ], outputs: [
    { name: "priceUsd6", type: "uint256" },
    { name: "lastUpdate", type: "uint256" },
  ] },
] as const;

const reputationAbi = [
  { name: "getReputation", type: "function", stateMutability: "view", inputs: [
    { name: "agent", type: "address" },
  ], outputs: [
    { name: "score", type: "uint256" },
    { name: "successfulRepayments", type: "uint256" },
    { name: "totalRepaidUsd6", type: "uint256" },
    { name: "gadEvents", type: "uint256" },
    { name: "lastUpdate", type: "uint256" },
  ] },
] as const;

const x402Abi = [
  { name: "record", type: "function", stateMutability: "nonpayable", inputs: [
    { name: "paymentId", type: "bytes32" },
    { name: "payer", type: "address" },
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
  ], outputs: [] },
  { name: "receipts", type: "function", stateMutability: "view", inputs: [
    { name: "paymentId", type: "bytes32" },
  ], outputs: [
    { name: "paymentId", type: "bytes32" },
    { name: "payer", type: "address" },
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "paidAt", type: "uint256" },
  ] },
] as const;

const lendingReadAbi = [
  { name: "agentConfigs", type: "function", stateMutability: "view", inputs: [
    { name: "", type: "address" },
  ], outputs: [
    { name: "dailyBorrowLimitUsd6", type: "uint256" },
    { name: "dailyBorrowedUsd6", type: "uint256" },
    { name: "periodStart", type: "uint256" },
    { name: "autoRepayEnabled", type: "bool" },
    { name: "x402Enabled", type: "bool" },
  ] },
] as const;

function Dashboard() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const usdc = CONTRACTS.usdc as `0x${string}`;
  const lending = CONTRACTS.lending as `0x${string}`;
  const lp = CONTRACTS.lp as `0x${string}`;
  const wbtc = CONTRACTS.wbtc as `0x${string}`;
  const weth = CONTRACTS.weth as `0x${string}`;
  const core = CONTRACTS.core as `0x${string}`;
  const reputation = CONTRACTS.reputation as `0x${string}`;
  const x402 = CONTRACTS.x402 as `0x${string}`;

  const { data: totalDeposits } = useReadContract({ address: lp, abi: lpAbi, functionName: "totalDeposits" });
  const { data: totalShares } = useReadContract({ address: lp, abi: lpAbi, functionName: "totalShares" });
  const { data: borrowCfg, refetch: refetchBorrowCfg } = useReadContract({ address: core, abi: coreAbi, functionName: "borrowableConfigs", args: [usdc] });
  const { data: repData, refetch: refetchRep } = useReadContract({ address: reputation, abi: reputationAbi, functionName: "getReputation", args: [address ?? "0x0000000000000000000000000000000000000000"] });
  const { data: agentCfgData, refetch: refetchAgentCfg } = useReadContract({ address: lending, abi: lendingReadAbi, functionName: "agentConfigs", args: [address ?? "0x0000000000000000000000000000000000000000"] });
  const { data: totalCollateralWBTC, refetch: refetchCollWBTC } = useReadContract({ address: lending, abi: lendingAbi, functionName: "totalCollateralOf", args: [address ?? "0x0000000000000000000000000000000000000000", wbtc] });
  const { data: totalCollateralWETH, refetch: refetchCollWETH } = useReadContract({ address: lending, abi: lendingAbi, functionName: "totalCollateralOf", args: [address ?? "0x0000000000000000000000000000000000000000", weth] });
  const { data: totalBorrowUSDC, refetch: refetchBorrowUSDC } = useReadContract({ address: lending, abi: lendingAbi, functionName: "totalBorrowOf", args: [address ?? "0x0000000000000000000000000000000000000000", usdc] });
  const { data: usdcBalanceRaw, refetch: refetchUsdcBal } = useReadContract({ address: usdc, abi: erc20Abi, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] });
  const { data: poolLiquidityRaw, refetch: refetchPoolLiq } = useReadContract({ address: usdc, abi: erc20Abi, functionName: "balanceOf", args: [lending] });

  const [mainTab, setMainTab] = useState<"borrow" | "lp">("borrow");
  const [actionTab, setActionTab] = useState<"supply" | "borrow" | "repay" | "withdraw">("supply");
  const [lpTab, setLpTab] = useState<"deposit" | "withdraw">("deposit");

  const [depositAmount, setDepositAmount] = useState("");
  const [depositAsset, setDepositAsset] = useState<"WETH" | "WBTC">("WETH");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [borrowAsset, setBorrowAsset] = useState<"USDC">("USDC");
  const [repayAmount, setRepayAmount] = useState("");
  const [repayAsset, setRepayAsset] = useState<"USDC">("USDC");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAsset, setWithdrawAsset] = useState<"WETH" | "WBTC">("WETH");
  const [lpAmount, setLpAmount] = useState("");
  const [lpAsset, setLpAsset] = useState<"USDC">("USDC");
  const [lpPosition, setLpPosition] = useState({ USDC: 0 });

  const [accountAgeDays, setAccountAgeDays] = useState(0);

  const { data: collCfg, refetch: refetchCollCfg } = useReadContract({ address: core, abi: coreAbi, functionName: "collateralConfigs", args: [depositAsset === "WETH" ? weth : wbtc] });
  const { data: priceWETH, refetch: refetchPriceWETH } = useReadContract({ address: core, abi: coreAbi, functionName: "priceFeeds", args: [weth] });
  const { data: priceWBTC, refetch: refetchPriceWBTC } = useReadContract({ address: core, abi: coreAbi, functionName: "priceFeeds", args: [wbtc] });
  const { data: priceUSDC, refetch: refetchPriceUSDC } = useReadContract({ address: core, abi: coreAbi, functionName: "priceFeeds", args: [usdc] });

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  const [agentConfig, setAgentConfig] = useState({
    enabled: false,
    dailyLimit: 0,
    autoRepay: false,
    x402Enabled: false,
  });
  const [positionInitialized, setPositionInitialized] = useState(false);

  useEffect(() => {
    if (!agentCfgData) return;
    const dailyLimitUsd6 = Number(agentCfgData[0] || 0) / 1e6;
    const autoRepay = Boolean(agentCfgData[3]);
    const x402Enabled = Boolean(agentCfgData[4]);
    const enabled = dailyLimitUsd6 > 0 || autoRepay || x402Enabled;
    setAgentConfig({
      enabled,
      dailyLimit: dailyLimitUsd6,
      autoRepay,
      x402Enabled,
    });
  }, [agentCfgData]);

  useEffect(() => {
    if (!repData) return;
    const last = Number(repData[4] || 0);
    if (!last) return;
    setAccountAgeDays(Math.floor((Date.now() / 1000 - last) / 86400));
  }, [repData]);

  const lpPoolUsd = totalDeposits ? Number(formatUnits(totalDeposits, 6)) : 0;
  const borrowApy = borrowCfg ? (Number(borrowCfg[1]) / 100) : 9;
  const supplyApy = Math.max(0, borrowApy * 0.8);
  const maxLtvFromCore = collCfg ? (Number(collCfg[1]) / 100) : 75;

  const collateralAmountWBTC = totalCollateralWBTC ? Number(formatUnits(totalCollateralWBTC, 8)) : 0;
  const collateralAmountWETH = totalCollateralWETH ? Number(formatUnits(totalCollateralWETH, 6)) : 0;
  const borrowedAmountUSDC = totalBorrowUSDC ? Number(formatUnits(totalBorrowUSDC, 6)) : 0;
  const usdcBalance = usdcBalanceRaw ? Number(formatUnits(usdcBalanceRaw, 6)) : 0;
  const poolLiquidity = poolLiquidityRaw ? Number(formatUnits(poolLiquidityRaw, 6)) : 0;

  const priceWethUsd = priceWETH ? Number(priceWETH[0]) / 1e6 : FALLBACK_PRICES.WETH;
  const priceWbtcUsd = priceWBTC ? Number(priceWBTC[0]) / 1e6 : FALLBACK_PRICES.WBTC;
  const priceUsdcUsd = priceUSDC ? Number(priceUSDC[0]) / 1e6 : FALLBACK_PRICES.USDC;

  const collateralValue = collateralAmountWBTC * priceWbtcUsd + collateralAmountWETH * priceWethUsd;
  const borrowedValue = borrowedAmountUSDC * priceUsdcUsd;

  const protocolStats = {
    lpPool: lpPoolUsd,
    totalCollateral: collateralValue,
    totalBorrowed: borrowedValue,
    get tvl() { return this.lpPool + this.totalCollateral; },
    get utilization() { return this.lpPool > 0 ? (this.totalBorrowed / this.lpPool) * 100 : 0; },
  };
  const onchainReputationScore = repData ? Number(repData[0]) : 0;
  const reputationScore = onchainReputationScore;
  const ltvBonus = reputationScore >= 400 ? 5 : reputationScore >= 200 ? 3 : reputationScore >= 100 ? 1 : 0;
  const maxLTV = maxLtvFromCore + ltvBonus;
  const currentLTV = collateralValue > 0 ? (borrowedValue / collateralValue) * 100 : 0;
  const healthFactor = collateralValue > 0 ? (collateralValue * maxLTV / 100) / Math.max(borrowedValue, 1) : 0;
  const maxBorrow = Math.max(0, collateralValue * maxLTV / 100 - borrowedValue);
  const maxWithdrawValue = Math.max(0, collateralValue - (borrowedValue * 100 / maxLTV));
  const lpTotalValue = lpPosition.USDC * priceUsdcUsd;

  const toAmount = (v: string, decimals: number) => parseUnits(v || "0", decimals);
  const toUSDC = (v: string) => toAmount(v, 6);
  const toWBTC = (v: string) => toAmount(v, 8);
  const toWETH = (v: string) => toAmount(v, 6);
  const collateralToken = depositAsset === "WETH" ? weth : wbtc;

  const refreshAll = () => {
    refetchBorrowCfg();
    refetchRep();
    refetchAgentCfg();
    refetchCollWBTC();
    refetchCollWETH();
    refetchBorrowUSDC();
    refetchUsdcBal();
    refetchPoolLiq();
    refetchCollCfg();
    refetchPriceWETH();
    refetchPriceWBTC();
    refetchPriceUSDC();
  };

  useEffect(() => {
    refreshAll();
    const t = setInterval(refreshAll, 15000);
    return () => clearInterval(t);
  }, [address, depositAsset]);

  const lpSharesForAmount = (amount: bigint) => {
    if (!totalDeposits || !totalShares || totalDeposits === BigInt(0) || totalShares === BigInt(0)) return amount;
    return (amount * totalShares) / totalDeposits;
  };

  const collateralAmountToUnits = (v: string) => depositAsset === "WETH" ? toWETH(v) : toWBTC(v);
  const withdrawAmountToUnits = (v: string) => withdrawAsset === "WETH" ? toWETH(v) : toWBTC(v);

  const requireAddress = (addr: string | undefined, label: string) => {
    if (!addr || !addr.startsWith("0x")) {
      showToast(`${label} address missing`, "error");
      return false;
    }
    return true;
  };

  const ensurePosition = async () => {
    if (positionInitialized) return;
    try {
      const hash = await writeContractAsync({ address: lending, abi: lendingAbi, functionName: "initializePosition" });
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
    } catch (e) {
      // ignore "exists" errors
    } finally {
      setPositionInitialized(true);
    }
  };

  async function safeTx(fn: () => Promise<`0x${string}` | void> | void, label: string) {
    try {
      const res = fn();
      const hash = res && typeof (res as Promise<unknown>).then === "function"
        ? await (res as Promise<`0x${string}` | void>)
        : (res as `0x${string}` | void);
      if (!hash) {
        showToast(`${label} not sent`, "error");
        return;
      }
      setLastTx(hash);
      showToast(`${label} sent ${hash.slice(0, 6)}…${hash.slice(-4)}`, "success");
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      showToast(`${label} confirmed`, "success");
      refreshAll();
    } catch (e) {
      showToast(`${label} failed`, "error");
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#001520] text-white flex flex-col gradient-bg">
        <Nav connected={false} onConnect={() => connect({ connector: injected() })} />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="relative">
            <div className="absolute inset-0 bg-[#FF4E00]/20 rounded-full blur-3xl scale-150"></div>
            <img src="/legasi-logo.svg" alt="Legasi" className="h-16 w-auto mb-6 relative z-10" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Connect MetaMask</h1>
          <p className="text-[#6a7a88] mb-8 text-center max-w-sm">
            Connect MetaMask to access the Legasi protocol
          </p>
          <button className="!bg-[#FF4E00] hover:bg-[#E64500] text-white font-semibold rounded-xl h-14 px-8" onClick={() => connect({ connector: injected() })}>
            Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#001520] text-white gradient-bg">
      <Nav connected address={address} onConnect={() => disconnect()} />

      <div className="max-w-6xl mx-auto px-6 pt-20 pb-8">
        {/* Protocol Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-[#051525]/50 border border-[#0a2535] rounded-xl">
          <div className="text-center">
            <div className="text-xs text-[#6a7a88] uppercase tracking-wider">Protocol TVL</div>
            <div className="text-lg font-bold text-white">${(protocolStats.tvl / 1e6).toFixed(1)}M</div>
          </div>
          <div className="text-center border-x border-[#0a2535]">
            <div className="text-xs text-[#6a7a88] uppercase tracking-wider">LP Pool</div>
            <div className="text-lg font-bold text-white">${(protocolStats.lpPool / 1e6).toFixed(1)}M</div>
          </div>
          <div className="text-center border-r border-[#0a2535]">
            <div className="text-xs text-[#6a7a88] uppercase tracking-wider">Total Borrowed</div>
            <div className="text-lg font-bold text-white">${(protocolStats.totalBorrowed / 1e6).toFixed(1)}M</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#6a7a88] uppercase tracking-wider">Utilization</div>
            <div className="text-lg font-bold text-[#FF4E00]">{protocolStats.utilization.toFixed(0)}%</div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setMainTab("borrow")}
            className={`flex-1 py-4 rounded-xl font-medium transition-all ${
              mainTab === "borrow" ? "bg-[#FF4E00] text-white" : "bg-[#051525]/80 text-[#8a9aa8] border border-[#0a2535] hover:border-[#1a3545] hover:text-white"
            }`}
          >
            Borrow
          </button>
          <button
            onClick={() => setMainTab("lp")}
            className={`flex-1 py-4 rounded-xl font-medium transition-all ${
              mainTab === "lp" ? "bg-[#FF4E00] text-white" : "bg-[#051525]/80 text-[#8a9aa8] border border-[#0a2535] hover:border-[#1a3545] hover:text-white"
            }`}
          >
            Provide Liquidity
          </button>
        </div>

        {mainTab === "borrow" && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <MetricCard label="Supplied" value={`$${collateralValue.toFixed(2)}`} />
              <MetricCard label="Borrowed" value={`$${borrowedValue.toFixed(2)}`} />
              <MetricCard label="LTV" value={`${currentLTV.toFixed(1)}%`} subtitle={`Max: ${maxLTV}%`} color="#FF4E00" />
              <MetricCard label="Health" value={healthFactor > 100 ? "Safe" : healthFactor.toFixed(2)} color="#ffd93d" />
              <MetricCard label="Reputation" value={Math.floor(reputationScore).toString()} subtitle={ltvBonus > 0 ? `+${ltvBonus}% LTV` : undefined} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex gap-1 p-1 bg-[#051525] border border-[#0a2535] rounded-xl mb-6">
                  {(["supply", "borrow", "repay", "withdraw"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActionTab(tab)}
                      className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                        actionTab === tab ? "bg-[#FF4E00] text-white shadow-lg shadow-[#FF4E00]/20" : "text-[#6a7a88] hover:text-white hover:bg-[#0a2535]"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl backdrop-blur-sm card-shine">
                  {/* Supply */}
                  {actionTab === "supply" && (
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Supply Collateral</h3>
                      <p className="text-sm text-[#6a7a88] mb-6">Deposit collateral to borrow against</p>
                      <div className="flex gap-2 mb-4">
                        {(["WETH", "WBTC"] as const).map((asset) => (
                          <button
                            key={asset}
                            onClick={() => setDepositAsset(asset)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              depositAsset === asset ? "bg-[#FF4E00]/20 text-[#FF4E00] border border-[#FF4E00]" : "bg-[#001520] text-[#6a7a88] border border-[#0a2535] hover:border-[#FF4E00]/30"
                            }`}
                          >
                            {asset}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <input type="number" placeholder="0.00" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="w-full h-14 bg-[#001520] border border-[#0a2535] rounded-xl px-4 pr-20 text-white placeholder-[#3a4a58] focus:outline-none focus:border-[#FF4E00] transition-all" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6a7a88] text-sm font-medium">{depositAsset}</span>
                        </div>
                        <div className="h-14 px-4 flex items-center text-xs text-[#6a7a88]">Auto‑approve included</div>
                        <button onClick={() => safeTx(async () => {
                          const token = depositAsset === "WETH" ? weth : wbtc;
                          const amt = collateralAmountToUnits(depositAmount);
                          const approveHash = await writeContractAsync({ address: token, abi: erc20Abi, functionName: "approve", args: [lending, amt] });
                          if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });
                          return writeContractAsync({ address: lending, abi: lendingAbi, functionName: "deposit", args: [token, amt] });
                        }, "Supply")}
                          disabled={!depositAmount}
                          className="h-14 px-8 bg-[#FF4E00] hover:bg-[#E64500] text-white font-semibold rounded-xl transition-all hover:scale-105 disabled:bg-[#0a2535] disabled:text-[#3a4a58] disabled:hover:scale-100">
                          Supply
                        </button>
                      </div>
                      <div className="mt-3 text-xs text-[#6a7a88]">≈ ${(parseFloat(depositAmount || "0") * (depositAsset === "WETH" ? priceWethUsd : priceWbtcUsd)).toFixed(2)} USD</div>
                    </div>
                  )}

                  {/* Borrow */}
                  {actionTab === "borrow" && (
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Borrow</h3>
                      <p className="text-sm text-[#6a7a88] mb-6">Borrow stablecoins against your collateral</p>
                      <div className="flex gap-2 mb-4">
                        {(["USDC"] as const).map((asset) => (
                          <button key={asset} onClick={() => setBorrowAsset(asset)} className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 bg-[#FF4E00]/20 text-[#FF4E00] border border-[#FF4E00]">
                            USDC.e <span className="text-xs opacity-60">{borrowApy}% APY</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1 relative">
                          <input type="number" placeholder="0.00" value={borrowAmount} onChange={(e) => setBorrowAmount(e.target.value)} className="w-full h-14 bg-[#001520] border border-[#0a2535] rounded-xl px-4 pr-20 text-white placeholder-[#3a4a58] focus:outline-none focus:border-[#FF4E00] transition-all" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6a7a88] text-sm font-medium">USDC.e</span>
                        </div>
                        <button onClick={() => setBorrowAmount(maxBorrow.toFixed(2))} className="h-14 px-4 bg-[#0a2535] hover:bg-[#1a3545] text-[#FF4E00] font-medium rounded-xl transition-all">MAX</button>
                        <button onClick={() => safeTx(async () => {
                          return writeContractAsync({ address: lending, abi: lendingAbi, functionName: "borrow", args: [usdc, toUSDC(borrowAmount)] });
                        }, "Borrow")}
                          disabled={!borrowAmount}
                          className="h-14 px-8 bg-[#FF4E00] hover:bg-[#E64500] text-white font-semibold rounded-xl transition-all hover:scale-105 disabled:bg-[#0a2535] disabled:text-[#3a4a58] disabled:hover:scale-100">
                          Borrow
                        </button>
                      </div>
                      <div className="p-4 bg-[#001520]/50 rounded-xl space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-[#6a7a88]">Available to borrow</span><span className="text-[#FF4E00] font-semibold">${maxBorrow.toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-[#6a7a88]">Borrow APY</span><span className="text-white">{borrowApy}%</span></div>
                        <div className="flex justify-between text-sm"><span className="text-[#6a7a88]">Pool Liquidity</span><span className="text-white">{poolLiquidity.toLocaleString()} USDC</span></div>
                      </div>
                      {poolLiquidity < 10000 && (
                        <button 
                          onClick={() => safeTx(async () => {
                            return writeContractAsync({ address: usdc, abi: erc20Abi, functionName: "mint", args: [lending, BigInt(100000 * 1e6)] });
                          }, "Seed Pool")}
                          className="mt-3 w-full h-10 bg-[#0a2535] hover:bg-[#1a3545] text-[#FF4E00] text-sm font-medium rounded-xl transition-all border border-[#FF4E00]/30">
                          ⚡ Seed Pool with 100k USDC (demo)
                        </button>
                      )}
                    </div>
                  )}

                  {/* Repay */}
                  {actionTab === "repay" && (
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Repay</h3>
                      <p className="text-sm text-[#6a7a88] mb-6">Repay your borrowed amount to unlock collateral</p>
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1 relative">
                          <input type="number" placeholder="0.00" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} className="w-full h-14 bg-[#001520] border border-[#0a2535] rounded-xl px-4 pr-20 text-white placeholder-[#3a4a58] focus:outline-none focus:border-[#4ade80] transition-all" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6a7a88] text-sm font-medium">USDC.e</span>
                        </div>
                        <div className="h-14 px-4 flex items-center text-xs text-[#6a7a88]">Auto‑approve included</div>
                        <button onClick={() => safeTx(async () => {
                          const amt = toUSDC(repayAmount);
                          const approveHash = await writeContractAsync({ address: usdc, abi: erc20Abi, functionName: "approve", args: [lending, amt] });
                          if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });
                          return writeContractAsync({ address: lending, abi: lendingAbi, functionName: "repay", args: [usdc, amt, amt] });
                        }, "Repay")}
                          disabled={!repayAmount}
                          className="h-14 px-8 bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold rounded-xl transition-all hover:scale-105 disabled:bg-[#0a2535] disabled:text-[#3a4a58] disabled:hover:scale-100">Repay</button>
                      </div>
                    </div>
                  )}

                  {/* Withdraw */}
                  {actionTab === "withdraw" && (
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Withdraw Collateral</h3>
                      <p className="text-sm text-[#6a7a88] mb-6">Withdraw your supplied collateral</p>
                      <div className="flex gap-2 mb-4">
                        {(["WETH", "WBTC"] as const).map((asset) => (
                          <button key={asset} onClick={() => setWithdrawAsset(asset)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${withdrawAsset === asset ? "bg-[#FF4E00]/20 text-[#FF4E00] border border-[#FF4E00]" : "bg-[#001520] text-[#6a7a88] border border-[#0a2535] hover:border-[#FF4E00]/30"}`}>{asset}</button>
                        ))}
                      </div>
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1 relative">
                          <input type="number" placeholder="0.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full h-14 bg-[#001520] border border-[#0a2535] rounded-xl px-4 pr-20 text-white placeholder-[#3a4a58] focus:outline-none focus:border-[#FF4E00] transition-all" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6a7a88] text-sm font-medium">{withdrawAsset}</span>
                        </div>
                        <button onClick={() => setWithdrawAmount((withdrawAsset === "WETH" ? collateralAmountWETH : collateralAmountWBTC).toString())} className="h-14 px-4 bg-[#0a2535] hover:bg-[#1a3545] text-[#FF4E00] font-medium rounded-xl transition-all">MAX</button>
                        <button onClick={() => safeTx(async () => {
                          const token = withdrawAsset === "WETH" ? weth : wbtc;
                          return writeContractAsync({ address: lending, abi: lendingAbi, functionName: "withdraw", args: [token, withdrawAmountToUnits(withdrawAmount)] });
                        }, "Withdraw")}
                        disabled={!withdrawAmount}
                        className="h-14 px-8 bg-[#FF4E00] hover:bg-[#E64500] text-white font-semibold rounded-xl transition-all hover:scale-105 disabled:bg-[#0a2535] disabled:text-[#3a4a58] disabled:hover:scale-100">Withdraw</button>
                      </div>
                      <div className="p-4 bg-[#001520]/50 rounded-xl space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-[#6a7a88]">Deposited {withdrawAsset}</span><span className="text-white font-semibold">{(withdrawAsset === "WETH" ? collateralAmountWETH : collateralAmountWBTC).toFixed(withdrawAsset === "WETH" ? 6 : 8)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-[#6a7a88]">Total collateral value</span><span className="text-white font-semibold">${collateralValue.toFixed(2)}</span></div>
                        {borrowedValue > 0 && (
                          <div className="flex justify-between text-sm"><span className="text-[#6a7a88]">Max withdrawable (LTV)</span><span className="text-[#FF4E00] font-semibold">${maxWithdrawValue.toFixed(2)}</span></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Agent Configuration */}
                <div className="mt-6 p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-semibold text-white">Agent Configuration</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${agentConfig.enabled ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20" : "bg-[#3a4a58]/20 text-[#6a7a88] border border-[#3a4a58]/20"}`}>
                      {agentConfig.enabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <AgentButton title="Standard" description="$1,000/day" active={agentConfig.enabled && agentConfig.dailyLimit === 1000} onClick={() => safeTx(async () => {
                      await writeContractAsync({ address: lending, abi: lendingAbi, functionName: "configureAgent", args: [toUSDC("1000"), true, true] });
                      setAgentConfig({ enabled: true, dailyLimit: 1000, autoRepay: true, x402Enabled: true });
                    }, "Configure agent")} />
                    <AgentButton title="Pro" description="$5,000/day" highlighted active={agentConfig.enabled && agentConfig.dailyLimit === 5000} onClick={() => safeTx(async () => {
                      await writeContractAsync({ address: lending, abi: lendingAbi, functionName: "configureAgent", args: [toUSDC("5000"), true, true] });
                      setAgentConfig({ enabled: true, dailyLimit: 5000, autoRepay: true, x402Enabled: true });
                    }, "Configure agent")} />
                    <AgentButton title="Disable" description="Manual only" active={!agentConfig.enabled} onClick={() => safeTx(async () => {
                      await writeContractAsync({ address: lending, abi: lendingAbi, functionName: "configureAgent", args: [BigInt(0), false, false] });
                      setAgentConfig({ enabled: false, dailyLimit: 0, autoRepay: false, x402Enabled: false });
                    }, "Configure agent")} />
                  </div>
                  {agentConfig.enabled && (
                    <div className="mt-4 p-4 bg-[#001520]/50 rounded-xl text-xs text-[#8a9aa8] space-y-2">
                      <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-[#4ade80]"></div>Auto-repay enabled</div>
                      <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-[#4ade80]"></div>x402 payments enabled</div>
                      <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-[#4ade80]"></div>Daily limit: ${agentConfig.dailyLimit.toLocaleString()}</div>
                    </div>
                  )}
                </div>

                {/* x402 Payment Demo */}
                <div className="mt-6 p-6 bg-gradient-to-br from-[#051525]/80 to-[#0a1a2e]/80 border border-[#1a3545] rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FF4E00]/10 flex items-center justify-center">
                      <span className="text-lg">⚡</span>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">x402 Payment Demo</h3>
                      <p className="text-xs text-[#6a7a88]">HTTP 402 machine-to-machine payments</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-[#001520]/60 rounded-xl mb-4">
                    <div className="text-xs text-[#6a7a88] mb-2">Simulated Service Request</div>
                    <div className="font-mono text-sm text-white bg-[#000a10] p-3 rounded-lg">
                      <div className="text-[#FF4E00]">GET /api/premium-data</div>
                      <div className="text-[#6a7a88]">→ 402 Payment Required</div>
                      <div className="text-[#4ade80]">Cost: 1 USDC</div>
                    </div>
                  </div>

                  <button 
                    onClick={() => safeTx(async () => {
                      // Generate payment ID
                      const paymentId = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
                      const serviceProvider = "0x000000000000000000000000000000000000dEaD" as `0x${string}`; // Demo recipient
                      const paymentAmount = BigInt(1_000_000); // 1 USDC
                      
                      // First approve USDC to x402 contract
                      const approveHash = await writeContractAsync({ 
                        address: usdc, 
                        abi: erc20Abi, 
                        functionName: "approve", 
                        args: [x402, paymentAmount] 
                      });
                      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: approveHash });
                      
                      // Record the payment on-chain
                      return writeContractAsync({ 
                        address: x402, 
                        abi: x402Abi, 
                        functionName: "record", 
                        args: [paymentId, address!, serviceProvider, paymentAmount] 
                      });
                    }, "x402 Payment")}
                    disabled={!agentConfig.x402Enabled}
                    className="w-full h-12 bg-[#FF4E00] hover:bg-[#E64500] text-white font-semibold rounded-xl transition-all hover:scale-[1.02] disabled:bg-[#0a2535] disabled:text-[#3a4a58] disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    <span>💸</span> Pay 1 USDC via x402
                  </button>
                  
                  {!agentConfig.x402Enabled && (
                    <p className="text-xs text-[#6a7a88] text-center mt-3">Enable x402 in Agent Configuration first</p>
                  )}
                  
                  <div className="mt-4 text-xs text-[#6a7a88]">
                    <div className="font-medium text-white mb-2">How it works:</div>
                    <ol className="space-y-1 list-decimal list-inside">
                      <li>Agent requests premium API endpoint</li>
                      <li>Server returns HTTP 402 with payment details</li>
                      <li>Agent pays via x402Receipt contract</li>
                      <li>Server verifies on-chain receipt, delivers data</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <div className="p-5 bg-[#051525]/80 border border-[#0a2535] rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-medium text-[#8a9aa8] mb-4">Your Positions</h3>
                  <div className="mb-4">
                    <div className="text-xs text-[#6a7a88] mb-2">Collateral</div>
                    <div className="text-sm text-white">{collateralAmountWETH.toFixed(4)} WETH / {collateralAmountWBTC.toFixed(4)} WBTC</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#6a7a88] mb-2">Borrowed</div>
                    <div className="text-sm text-white">{borrowedAmountUSDC.toFixed(2)} USDC.e</div>
                  </div>
                </div>

                <div className="p-5 bg-[#051525]/80 border border-[#0a2535] rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-medium text-[#8a9aa8] mb-4">Reputation</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#6a7a88]">Score</span><span>{Math.floor(reputationScore)}</span></div>
                    <div className="flex justify-between"><span className="text-[#6a7a88]">Repayments</span><span>{repData ? Number(repData[1]) : 0}</span></div>
                    <div className="flex justify-between"><span className="text-[#6a7a88]">GAD Events</span><span>{repData ? Number(repData[3]) : 0}</span></div>
                    <div className="flex justify-between"><span className="text-[#6a7a88]">Account Age</span><span>{accountAgeDays}d</span></div>
                    <div className="flex justify-between"><span className="text-[#6a7a88]">LTV Bonus</span><span className="text-[#FF4E00]">+{ltvBonus}%</span></div>
                  </div>
                </div>

                <div className="p-5 bg-[#051525]/80 border border-[#0a2535] rounded-2xl backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FF4E00]/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#FF4E00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white">GAD Protection</h3>
                  </div>
                  <p className="text-xs text-[#6a7a88] leading-relaxed">No sudden liquidations. Your position is unwound gradually over time, protecting you from MEV attacks.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {mainTab === "lp" && (
          <>
            {/* LP Overview */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <MetricCard label="Your LP Value" value={`$${lpTotalValue.toFixed(2)}`} />
              <MetricCard label="USDC.e APY" value={`${supplyApy.toFixed(1)}%`} color="#4ade80" />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main LP Panel */}
              <div className="lg:col-span-2">
                {/* LP Tabs */}
                <div className="flex gap-1 p-1 bg-[#051525] border border-[#0a2535] rounded-xl mb-6 w-fit">
                  {(["deposit", "withdraw"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setLpTab(tab)}
                      className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${
                        lpTab === tab
                          ? "bg-[#FF4E00] text-white"
                          : "text-[#6a7a88] hover:text-white hover:bg-[#0a2535]"
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="p-6 bg-[#051525]/80 border border-[#0a2535] rounded-2xl backdrop-blur-sm">
                  <h3 className="text-xl font-semibold mb-2">
                    {lpTab === "deposit" ? "Provide Liquidity" : "Withdraw Liquidity"}
                  </h3>
                  <p className="text-sm text-[#6a7a88] mb-6">
                    {lpTab === "deposit"
                      ? "Earn yield by providing liquidity to the protocol"
                      : "Withdraw your provided liquidity"}
                  </p>

                  {/* Asset selector */}
                  <div className="flex gap-2 mb-4">
                    {(["USDC.e"] as const).map((asset) => (
                      <button
                        key={asset}
                        onClick={() => setLpAsset("USDC")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]`}
                      >
                        {asset}
                        <span className="text-xs opacity-60">{supplyApy.toFixed(1)}% APY</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={lpAmount}
                        onChange={(e) => setLpAmount(e.target.value)}
                        className="w-full h-14 bg-[#001520] border border-[#0a2535] rounded-xl px-4 pr-20 text-white placeholder-[#3a4a58] focus:outline-none focus:border-[#4ade80] transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6a7a88] text-sm font-medium">
                        USDC.e
                      </span>
                    </div>
                    {lpTab === "withdraw" && (
                      <button
                        onClick={() => setLpAmount(lpPosition.USDC.toString())}
                        className="h-14 px-4 bg-[#0a2535] hover:bg-[#1a3545] text-[#4ade80] font-medium rounded-xl transition-all"
                      >
                        MAX
                      </button>
                    )}
                    <button
                      onClick={() => safeTx(async () => {
                        const amount = parseFloat(lpAmount || "0");
                        if (lpTab === "deposit") {
                          await writeContractAsync({ address: usdc, abi: erc20Abi, functionName: "approve", args: [lp, toUSDC(lpAmount)] });
                          await writeContractAsync({ address: lp, abi: lpAbi, functionName: "deposit", args: [toUSDC(lpAmount)] });
                          setLpPosition(prev => ({ ...prev, USDC: prev.USDC + amount }));
                        } else {
                          const shares = lpSharesForAmount(toUSDC(lpAmount));
                          await writeContractAsync({ address: lp, abi: lpAbi, functionName: "withdraw", args: [shares] });
                          setLpPosition(prev => ({ ...prev, USDC: Math.max(0, prev.USDC - amount) }));
                        }
                        setLpAmount("");
                      }, lpTab === "deposit" ? "LP deposit" : "LP withdraw")}
                      disabled={!lpAmount}
                      className={`h-14 px-8 font-semibold rounded-xl transition-all hover:scale-105 disabled:bg-[#0a2535] disabled:text-[#3a4a58] disabled:hover:scale-100 ${
                        lpTab === "deposit" ? "bg-[#4ade80] hover:bg-[#22c55e] text-black" : "bg-[#FF4E00] hover:bg-[#E64500] text-white"
                      }`}
                    >
                      {lpTab === "deposit" ? "Deposit" : "Withdraw"}
                    </button>
                  </div>

                  <div className="mt-6 p-4 bg-[#001520]/50 rounded-xl space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6a7a88]">Your USDC.e in pool</span>
                      <span className="text-white font-semibold">{lpPosition.USDC.toFixed(2)} USDC.e</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6a7a88]">Estimated yearly earnings</span>
                      <span className="text-[#4ade80] font-semibold">
                        ${(lpPosition.USDC * supplyApy / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LP Sidebar */}
              <div className="space-y-4">
                <div className="p-5 bg-[#051525]/80 border border-[#0a2535] rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-medium text-[#8a9aa8] mb-4">Your LP Positions</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-white">USDC.e</span>
                      <div className="text-right">
                        <div className="text-white font-medium">{lpPosition.USDC.toFixed(2)}</div>
                        <div className="text-xs text-[#4ade80]">{supplyApy.toFixed(1)}% APY</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-[#051525]/80 border border-[#0a2535] rounded-2xl backdrop-blur-sm">
                  <h3 className="text-sm font-medium text-[#8a9aa8] mb-4">Pool Statistics</h3>
                  <div className="space-y-3">
                    <InfoRow label="Total USDC.e Pool" value="$1.2M" />
                    <InfoRow label="Utilization Rate" value={`${protocolStats.utilization}%`} />
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-br from-[#0a2535]/80 to-[#051525]/80 border border-[#4ade80]/10 rounded-2xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#4ade80]/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-white">Agent-Native Protocol</h3>
                  </div>
                  <p className="text-xs text-[#6a7a88] leading-relaxed mb-2">
                    AI agents are first-class citizens: they can borrow autonomously AND provide liquidity to earn yield.
                  </p>
                  <div className="text-xs text-[#4ade80]/80 space-y-1">
                    <div>• Agents as borrowers: autonomous credit</div>
                    <div>• Agents as LPs: yield optimization</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-10">
          <Link href="/" className="text-sm text-[#8a9aa8] hover:text-white">← Back</Link>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function Nav({ connected, onConnect, address }: { connected: boolean; onConnect: () => void; address?: string }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#001520]/80 backdrop-blur-xl border-b border-[#0a2535]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/legasi-logo.svg" alt="Legasi" className="h-7 w-auto" />
        </div>
        <div className="flex items-center gap-3">
          <a href="/faucet" className="text-sm text-[#8a9aa8] hover:text-white">Faucet</a>
          {!connected ? (
            <button className="h-9 px-4 bg-[#FF4E00] hover:bg-[#E64500] text-white rounded-xl font-semibold" onClick={onConnect}>Connect MetaMask</button>
          ) : (
            <div className="relative">
            <button className="h-9 px-4 bg-[#FF4E00] hover:bg-[#E64500] text-white rounded-xl font-semibold" onClick={() => setUserMenuOpen((v) => !v)}>{address?.slice(0, 6)}…{address?.slice(-4)}</button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-[#051525] border border-[#0a2535] rounded-xl shadow-xl z-50">
                <button className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#0a2535] rounded-xl" onClick={onConnect}>Disconnect</button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function MetricCard({ label, value, subtitle, color }: { label: string; value: string; subtitle?: string; color?: string }) {
  return (
    <div className="p-4 bg-[#051525]/80 border border-[#0a2535] rounded-2xl">
      <div className="text-xs text-[#6a7a88] uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold" style={{ color: color || "#fff" }}>{value}</div>
      {subtitle && <div className="text-xs text-[#6a7a88] mt-1">{subtitle}</div>}
    </div>
  );
}

function AgentButton({ title, description, active, highlighted, onClick }: { title: string; description: string; active?: boolean; highlighted?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`p-4 rounded-xl text-sm font-medium border transition-all ${
      active ? "bg-[#FF4E00]/20 text-[#FF4E00] border-[#FF4E00]" : highlighted ? "bg-[#001520] border-[#0a2535] hover:border-[#FF4E00]/40" : "bg-[#001520] border-[#0a2535] hover:border-[#1a3545]"
    }`}>
      <div>{title}</div>
      <div className="text-xs text-[#6a7a88] mt-1">{description}</div>
    </button>
  );
}

function SmallTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`h-8 px-3 rounded-md text-xs border ${active ? "bg-white text-black border-white" : "bg-[#0a2535] border-[#1a3545] text-[#8a9aa8]"}`} onClick={onClick}>
      {children}
    </button>
  );
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="h-11 px-4 bg-[#0a2535] border border-[#1a3545] rounded-lg hover:bg-[#0d3040] text-left" onClick={onClick}>
      {label}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[#6a7a88]">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
