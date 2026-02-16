"use client";

import { useState } from "react";

/**
 * Placeholder hook for Legasi EVM integration
 * Main interactions are done directly in Dashboard via wagmi
 */
export function useLegasi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    loading,
    error,
    connected: true,
  };
}
