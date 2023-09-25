"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { verifySignIn } from "@solana/wallet-standard-util";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Image,
  Input,
  RadioGroup,
  Radio,
} from "@nextui-org/react";
import { useNotify } from "../components/Notify";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState, useMemo, useCallback } from "react";

const radioList = [{ label: "SOL", value: "sol" }];

export default function Home() {
  const notify = useNotify();
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();

  const [balance, setBalance] = useState(0);
  const [depositValue, setDepositValue] = useState("");
  const [borrowValue, setBorrowValue] = useState("");

  const depositDisabled = useMemo(
    () =>
      !depositValue ||
      !connected ||
      depositValue === "0" ||
      Number(depositValue) > balance,
    [depositValue, balance, connected]
  );

  const borrowDisabled = useMemo(
    () => !borrowValue || !connected || borrowValue === "0",
    [borrowValue, connected]
  );

  const getBalance = useCallback(async () => {
    try {
      if (publicKey) {
        const balance = await connection.getBalance(publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    } catch (error) {
      console.log(error);
    }
  }, [connection, publicKey]);

  const handleDeposit = useCallback(async () => {
    try {
      if (!connected) throw new Error("Wallet not connected");

      notify("success", `Deposit successfully`);
    } catch (error: any) {
      notify("error", `Deposit In failed: ${error?.message}`);
    }
  }, [connected, notify]);

  const handleBorrow = useCallback(async () => {
    try {
      if (!connected) throw new Error("Wallet not connected");

      notify("success", `Borrow successfully`);
    } catch (error: any) {
      notify("error", `Deposit In failed: ${error?.message}`);
    }
  }, [connected, notify]);

  useEffect(() => {
    if (connected) {
      getBalance();
    }
  }, [connected, getBalance]);

  return (
    <main className="container flex min-h-screen flex-col items-center mx-auto py-4">
      <div className="w-full items-center justify-between text-sm flex">
        <code className="font-bold">CC LENDING</code>
        <WalletMultiButton className="rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500" />
      </div>
      <div className="grid grid-cols-2 gap-6 mt-20">
        <Card className="w-96">
          <CardHeader>
            <Image
              src="https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png"
              className="w-6 h-6 rounded-full"
              alt="solana"
            />
            <p className="font-semibold ml-2">Lending</p>
          </CardHeader>
          <CardBody className="flex-col justify-between text-small">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-slate-500">Balance</label>
                <p className="font-semibold text-slate-700">{balance} SOL</p>
              </div>
              <Input
                type="number"
                label={<label className="text-slate-500">Amount</label>}
                min={0}
                max={balance}
                fullWidth
                value={depositValue}
                onChange={(e) => setDepositValue(e.target.value)}
                labelPlacement="outside-left"
                placeholder="Enter your amount"
                className="mt-4 justify-between"
                classNames={{
                  mainWrapper: "flex-auto",
                  input: "text-right",
                }}
              />
            </div>
            <Button
              className="mt-6"
              color={depositDisabled ? undefined : "primary"}
              disabled={depositDisabled}
              onClick={handleDeposit}
            >
              Deposit
            </Button>
          </CardBody>
        </Card>
        <Card className="w-96">
          <CardHeader>
            <Image
              src="https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png"
              className="w-6 h-6 rounded-full"
              alt="solana"
            />
            <p className="font-semibold ml-2">Order</p>
          </CardHeader>
          <CardBody className="flex-col justify-between pt-0 text-small">
            <div>
              <div className="flex py-2 items-center justify-between">
                <label className="text-slate-500">Lendable amount</label>
                <p className="font-semibold text-slate-700">0.5 SOL</p>
              </div>
              <div className="flex py-2 items-center justify-between">
                <label className="text-slate-500">Monthly interest rate</label>
                <p className="font-semibold text-slate-700">1%</p>
              </div>
              <RadioGroup
                label={
                  <label className="text-slate-500">Select your token</label>
                }
                defaultValue={radioList[0].value}
                className="py-2"
                orientation="horizontal"
              >
                {radioList.map((item) => (
                  <Radio
                    key={item.value}
                    value={item.value}
                    classNames={{ label: "text-slate-700" }}
                  >
                    {item.label}
                  </Radio>
                ))}
              </RadioGroup>
              <Input
                type="number"
                label={<label className="text-slate-500">Amount</label>}
                min={0}
                max={999}
                fullWidth
                value={borrowValue}
                onChange={(e) => setBorrowValue(e.target.value)}
                labelPlacement="outside-left"
                placeholder="Enter your amount"
                className="py-2 justify-between"
                classNames={{
                  mainWrapper: "flex-auto",
                  input: "text-right",
                }}
              />
            </div>
            <Button
              className="mt-6"
              color={borrowDisabled ? undefined : "primary"}
              disabled={borrowDisabled}
              onClick={handleBorrow}
            >
              Borrow
            </Button>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
