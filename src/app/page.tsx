"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { verifySignIn } from "@solana/wallet-standard-util";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Divider,
  Image,
} from "@nextui-org/react";
import { useNotify } from "../components/Notify";
import { SolanaSignInInput } from "@solana/wallet-standard-features";
import bs58 from "bs58";

export default function Home() {
  const { signIn, publicKey } = useWallet();
  const notify = useNotify();

  console.log("publicKey", publicKey, signIn);

  const connectWallet = async () => {
    try {
      if (!signIn)
        throw new Error("Wallet does not support Sign In With Solana!");

      const input: SolanaSignInInput = {
        domain: window.location.host,
        address: publicKey ? publicKey.toBase58() : undefined,
        statement: "Please sign in.",
      };
      const output = await signIn(input);

      if (!verifySignIn(input, output))
        throw new Error("Sign In verification failed!");

      notify("success", `Message signature: ${bs58.encode(output.signature)}`);
    } catch (error: any) {
      notify("error", `Sign In failed: ${error?.message}`);
    }
  };

  return (
    <main className="container flex min-h-screen flex-col items-center mx-auto py-4">
      <div className="w-full items-center justify-between font-mono text-sm flex">
        <code className="font-mono font-bold">CC LENDING</code>
        <div className="flex justify-between">
          <div className="flex p-2 rounded-full bg-slate-300 mr-2">
            <Image
              src="https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png"
              className="w-6 h-6 rounded-full"
              alt="eth"
            />
            <Image
              src="https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png"
              className="w-6 h-6 rounded-full"
              alt="solana"
            />
          </div>
          <Button
            radius="full"
            color="primary"
            onClick={connectWallet}
            className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-sm"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
      <div className="w-full flex py-6">
        <p className="h3 text-pink-500">Balance</p>
      </div>
      <Card className="mt-32 w-96">
        <CardHeader>Lending</CardHeader>
        <Divider />
        <CardBody>Lending Content</CardBody>
      </Card>
    </main>
  );
}
