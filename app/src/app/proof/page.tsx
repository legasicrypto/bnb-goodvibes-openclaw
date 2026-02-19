export const dynamic = "force-static";

const EXPLORER = "https://testnet.bscscan.com";

const contracts = [
  { name: "LegasiCore", address: "0x7C3dd137c13653aaa8457A220aa4B586a30AD7F6" },
  { name: "LegasiLending", address: "0x06bd127D48D9b82885b2692628d3bf12CdFCC5d7" },
  { name: "LegasiLP", address: "0xDd5605472769C91C3592023A445f1B4aB0cAED7a" },
  { name: "LegasiGAD", address: "0x0eD2B07885Bb42D36d910857b02A5c797BcF8724" },
  { name: "ReputationRegistry", address: "0x02c0B1A438eCccD978D11889f19cd20A5584fBFf" },
  { name: "X402Receipt (v1, legacy)", address: "0x988aA233bc27d60110c6026897d7e41F4C6D3C7c" },
  { name: "X402USDCReceipt (v2)", address: "0x570BF4EdE1029c7Bc610f507c7D7a252F7328F24" },
] as const;

const proofs = [
  {
    name: "Borrow mUSDC",
    tx: "0xe26324b66cdb63f9448d973a1589e6f87e87f811e544cff2f48171de62d6bc7e",
  },
  {
    name: "Repay mUSDC",
    tx: "0x7b2ef68207ff4706fd3cdb4979ffa414078bc42b166a328de195afd783a317e1",
  },
  {
    name: "x402 pay() (X402USDCReceipt v2)",
    tx: "0x1e13cace3bc282d0e4dad4db96e5927ff6fe6a401c129e454572c259596ee001",
  },
] as const;

export default function ProofPage() {
  return (
    <main className="min-h-screen bg-[#001520] text-white px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold">On-chain Proof</h1>
        <p className="text-[#8a9aa8] mt-2">
          Network: <span className="text-white font-semibold">BNB Smart Chain Testnet</span> (chainId 97) • Explorer:{" "}
          <a className="underline" href={EXPLORER} target="_blank" rel="noreferrer">
            {EXPLORER}
          </a>
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Core contracts</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {contracts.map((c) => (
              <a
                key={c.address}
                className="p-4 bg-[#051525]/80 border border-[#0a2535] rounded-xl hover:border-[#FF4E00]/40 transition-colors"
                href={`${EXPLORER}/address/${c.address}`}
                target="_blank"
                rel="noreferrer"
              >
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="mt-1 font-mono text-xs text-[#8a9aa8] break-all">{c.address}</div>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Proof transactions</h2>
          <div className="mt-4 space-y-3">
            {proofs.map((p) => (
              <a
                key={p.tx}
                className="block p-4 bg-[#051525]/80 border border-[#0a2535] rounded-xl hover:border-[#FF4E00]/40 transition-colors"
                href={`${EXPLORER}/tx/${p.tx}`}
                target="_blank"
                rel="noreferrer"
              >
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="mt-1 font-mono text-xs text-[#8a9aa8] break-all">{p.tx}</div>
              </a>
            ))}
          </div>

          <p className="text-[#8a9aa8] text-sm mt-4">
            Full details: {" "}
            <a
              className="underline"
              href="https://github.com/legasicrypto/bnb-goodvibes-openclaw/blob/main/docs/DEPLOYMENTS.md"
              target="_blank"
              rel="noreferrer"
            >
              docs/DEPLOYMENTS.md
            </a>
          </p>
        </section>

        <div className="mt-10">
          <a className="text-sm text-[#8a9aa8] hover:text-white" href="/demo">
            ← Back to demo
          </a>
        </div>
      </div>
    </main>
  );
}
