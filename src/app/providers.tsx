// app/providers.tsx
"use client";

import { NextUIProvider } from "@nextui-org/react";
import { clusterApiUrl } from "@solana/web3.js";
import {
  Adapter,
  WalletAdapterNetwork,
  WalletError,
} from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { verifySignIn } from "@solana/wallet-standard-util";
import { type SolanaSignInInput } from "@solana/wallet-standard-features";
import { SnackbarProvider, useSnackbar } from "notistack";
import { useCallback, useMemo } from "react";
import {
  AutoConnectProvider,
  useAutoConnect,
} from "../components/AutoConnectProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      /**
       * Wallets that implement either of these standards will be available automatically.
       *
       *   - Solana Mobile Stack Mobile Wallet Adapter Protocol
       *     (https://github.com/solana-mobile/mobile-wallet-adapter)
       *   - Solana Wallet Standard
       *     (https://github.com/solana-labs/wallet-standard)
       *
       * If you wish to support a wallet that supports neither of those standards,
       * instantiate its legacy wallet adapter here. Common legacy adapters can be found
       * in the npm package `@solana/wallet-adapter-wallets`.
       */
      new PhantomWalletAdapter(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  const { autoConnect } = useAutoConnect();
  const { enqueueSnackbar } = useSnackbar();

  const onError = useCallback(
    (error: WalletError, adapter?: Adapter) => {
      enqueueSnackbar(
        error.message ? `${error.name}: ${error.message}` : error.name,
        { variant: "error" }
      );
      console.error(error, adapter);
    },
    [enqueueSnackbar]
  );

  const autoSignIn = useCallback(async (adapter: Adapter) => {
    if (!("signIn" in adapter)) return true;

    const input: SolanaSignInInput = {
      domain: window.location.host,
      address: adapter.publicKey ? adapter.publicKey.toBase58() : undefined,
      statement: "Please sign in.",
    };
    const output = await adapter.signIn(input);

    if (!verifySignIn(input, output))
      throw new Error("Sign In verification failed!");

    return false;
  }, []);

  return (
    <SnackbarProvider>
      <AutoConnectProvider>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider
            wallets={[]}
            onError={onError}
            autoConnect={autoConnect && autoSignIn}
          >
            <NextUIProvider>{children}</NextUIProvider>;
          </WalletProvider>
        </ConnectionProvider>
      </AutoConnectProvider>
    </SnackbarProvider>
  );
}
