"use client";

import { format } from "date-fns";
import * as anchor from "@project-serum/anchor";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Input,
  Image,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/react";
import {
  LAMPORTS_PER_SOL,
  SYSVAR_CLOCK_PUBKEY,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNotify } from "@/components/Notify";
import {
  SPL_TOKEN_LENDING_PROGRAM_ID,
  useWorkspace,
} from "@/components/WorkspaceProvider";
import { getShortAddress } from "@/utils/getShortAddress";

type Order = {
  sn: number;
  lender: string;
  balance: number;
  rate: number;
};

type Receipt = {
  sn: number;
  borrower: string;
  lender: string;
  rate: number;
  amount: number;
  time: number;
};

export default function Home() {
  const notify = useNotify();
  const { program } = useWorkspace();
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isReceiptOpen,
    onOpen: onReceiptOpen,
    onClose: onReceiptClose,
  } = useDisclosure();

  const [balance, setBalance] = useState(0);
  const [lendableBalance, setLendableBalance] = useState(0);
  const [depositValue, setDepositValue] = useState("");
  const [lendValue, setLendValue] = useState("");
  const [borrowValue, setBorrowValue] = useState("");
  const [lending, setLending] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [repaying, setRepaying] = useState(false);
  const [order, setOrder] = useState<Order | undefined>();
  const [receipt, setReceipt] = useState<Receipt | undefined>();
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [receiptList, setReceiptList] = useState<Receipt[]>([]);
  const [, setLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const depositDisabled = useMemo(
    () =>
      !depositValue ||
      !connected ||
      depositValue === "0" ||
      Number(depositValue) > Number(balance.toFixed(4)),
    [depositValue, balance, connected]
  );

  const lendDisabled = useMemo(
    () =>
      !lendValue ||
      !connected ||
      lendValue === "0" ||
      Number(lendValue) > Number(lendableBalance.toFixed(4)),
    [lendValue, lendableBalance, connected]
  );

  const borrowDisabled = useMemo(
    () =>
      !order ||
      !borrowValue ||
      !connected ||
      borrowValue === "0" ||
      Number(borrowValue) > Number(order.balance.toFixed(4)),
    [order, borrowValue, connected]
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

  const getLendableBalance = useCallback(async () => {
    try {
      if (!connected || !program || !publicKey)
        throw new Error("Wallet not connected");

      const [userBalance] = PublicKey.findProgramAddressSync(
        [Buffer.from("balance_4"), publicKey.toBuffer()],
        SPL_TOKEN_LENDING_PROGRAM_ID
      );
      const balance = await connection.getBalance(userBalance);
      setLendableBalance(balance / LAMPORTS_PER_SOL);
    } catch (error: any) {
      notify("error", `Get lendable balance failed: ${error?.message}`);
    }
  }, [connected, connection, notify, program, publicKey]);

  const getOrders = useCallback(async () => {
    try {
      const orders = await connection.getProgramAccounts(
        SPL_TOKEN_LENDING_PROGRAM_ID,
        {
          filters: [
            { dataSize: 58 },
            // {
            //   memcmp: {
            //     offset: 16,
            //     bytes: publicKey.toBase58(),
            //   },
            // },
          ],
        }
      );

      const list = orders.map((e) => {
        const data = e.account.data;
        const sn = Number(data.readBigUInt64LE(8));
        const lender = new PublicKey(data.subarray(16, 48));
        const balance = Number(data.readBigUInt64LE(48));
        const rate = data.readUInt16LE(56);

        return {
          sn,
          lender: lender.toBase58(),
          balance: balance / LAMPORTS_PER_SOL,
          rate,
        };
      });

      setOrderList(list);
    } catch (error: any) {
      notify("error", `Get orders failed: ${error?.message}`);
    } finally {
      setLoading(true);
    }
  }, [connection, notify]);

  const getReceipts = useCallback(async () => {
    try {
      if (!connected || !program || !publicKey)
        throw new Error("Wallet not connected");

      setReceiptLoading(true);

      const receipts = await connection.getProgramAccounts(
        SPL_TOKEN_LENDING_PROGRAM_ID,
        {
          filters: [
            { dataSize: 98 },
            {
              memcmp: {
                offset: 16,
                bytes: publicKey.toBase58(),
              },
            },
          ],
        }
      );
      const list = receipts.map((e) => {
        const data = e.account.data;
        const sn = Number(data.readBigUInt64LE(8));
        const borrower = new PublicKey(data.subarray(16, 48));
        const lender = new PublicKey(data.subarray(48, 80));
        const amount = Number(data.readBigUInt64LE(80));
        const time = Number(data.readBigUInt64LE(88));
        const rate = data.readUInt16LE(96);

        return {
          sn,
          lender: lender.toBase58(),
          borrower: borrower.toBase58(),
          amount: amount / LAMPORTS_PER_SOL,
          time,
          rate,
        };
      });

      setReceiptList(list);
      setReceiptLoading(false);
    } catch (error: any) {
      notify("error", `Get orders failed: ${error?.message}`);
    } finally {
      setReceiptLoading(false);
    }
  }, [connected, connection, notify, program, publicKey]);

  const handleDeposit = useCallback(async () => {
    try {
      if (!connected || !program || !publicKey)
        throw new Error("Wallet not connected");

      setDepositing(true);

      const [userBalance] = PublicKey.findProgramAddressSync(
        [Buffer.from("balance_4"), publicKey.toBuffer()],
        SPL_TOKEN_LENDING_PROGRAM_ID
      );

      const result = await program?.methods
        .deposit(new anchor.BN(Number(depositValue) * 10 ** 9))
        .accounts({
          userBalance,
          payer: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await getBalance();
      await getLendableBalance();

      setDepositing(false);
      notify("success", `Deposit successfully, transaction hash is ${result}`);
    } catch (error: any) {
      setDepositing(false);
      notify("error", `Deposit failed: ${error?.message}`);
    }
  }, [
    connected,
    program,
    publicKey,
    depositValue,
    getBalance,
    getLendableBalance,
    notify,
  ]);

  const handleLend = useCallback(async () => {
    try {
      if (!connected || !publicKey) throw new Error("Wallet not connected");

      setLending(true);

      const [globalState] = PublicKey.findProgramAddressSync(
        [Buffer.from("state_4")],
        SPL_TOKEN_LENDING_PROGRAM_ID
      );
      const [config] = PublicKey.findProgramAddressSync(
        [Buffer.from("config_4")],
        SPL_TOKEN_LENDING_PROGRAM_ID
      );
      const stateInfo = await connection.getAccountInfo(globalState);

      if (stateInfo) {
        const [order] = PublicKey.findProgramAddressSync(
          [Buffer.from("order_4"), stateInfo.data.subarray(8, 16)],
          SPL_TOKEN_LENDING_PROGRAM_ID
        );
        const [userBalance] = PublicKey.findProgramAddressSync(
          [Buffer.from("balance_4"), publicKey.toBuffer()],
          SPL_TOKEN_LENDING_PROGRAM_ID
        );

        const result = await program?.methods
          .placeOrder(
            new anchor.BN(Number(lendValue) * 10 ** 9),
            new anchor.BN(100)
          )
          .accounts({
            order,
            config,
            userBalance,
            payer: publicKey,
            global: globalState,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        getOrders();
        notify("success", `Lend successfully, transaction hash ${result}`);
      }
    } catch (error: any) {
      notify("error", `Lend failed: ${error?.message}`);
    } finally {
      setLending(false);
    }
  }, [
    connected,
    publicKey,
    connection,
    program?.methods,
    lendValue,
    getOrders,
    notify,
  ]);

  const handleOrderOpen = useCallback(
    (item: Order) => {
      setOrder(item);
      onOpen();
    },
    [onOpen]
  );

  const handleClose = () => {
    onClose();
    setOrder(undefined);
  };

  const handleReceiptOpen = useCallback(
    (item: Receipt) => {
      setReceipt(item);
      onReceiptOpen();
    },
    [onReceiptOpen]
  );

  const handleReceiptClose = () => {
    onReceiptClose();
    setBorrowValue("");
    setReceipt(undefined);
  };

  const handleBorrow = useCallback(async () => {
    try {
      setBorrowing(true);

      if (!connected || !publicKey) throw new Error("Wallet not connected");

      if (order) {
        const [globalState] = PublicKey.findProgramAddressSync(
          [Buffer.from("state_4")],
          SPL_TOKEN_LENDING_PROGRAM_ID
        );
        const stateInfo = await connection.getAccountInfo(globalState);
        const buffer = Buffer.allocUnsafe(8);

        buffer.writeBigUInt64LE(BigInt(order.sn));

        const [orderAddress] = PublicKey.findProgramAddressSync(
          [Buffer.from("order_4"), buffer],
          SPL_TOKEN_LENDING_PROGRAM_ID
        );

        if (stateInfo) {
          const [receiptAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("receipt_4"), stateInfo.data.subarray(16, 24)],
            SPL_TOKEN_LENDING_PROGRAM_ID
          );

          await program?.methods
            .borrow(
              new anchor.BN(order.sn),
              new anchor.BN(Number(borrowValue) * 10 ** 9)
            )
            .accounts({
              receipt: receiptAddress,
              order: orderAddress,
              global: globalState,
              recipient: publicKey,
              payer: publicKey,
              systemProgram: SystemProgram.programId,
              clock: SYSVAR_CLOCK_PUBKEY,
            })
            .rpc();
        }

        onClose();
        setBorrowing(false);
        getBalance();
        getOrders();
      }
    } catch (error: any) {
      notify("error", `Borrow failed: ${error?.message}`);
    } finally {
      setBorrowing(false);
    }
  }, [
    borrowValue,
    connected,
    connection,
    notify,
    onClose,
    getBalance,
    getOrders,
    order,
    program?.methods,
    publicKey,
  ]);

  const handleReceipt = useCallback(async () => {
    try {
      setRepaying(true);

      if (!connected || !publicKey) throw new Error("Wallet not connected");

      if (receipt) {
        const buffer = Buffer.allocUnsafe(8);

        buffer.writeBigUInt64LE(BigInt(receipt.sn));

        const [receiptAddress] = PublicKey.findProgramAddressSync(
          [Buffer.from("receipt_4"), buffer],
          SPL_TOKEN_LENDING_PROGRAM_ID
        );
        const receiptInfo = await connection.getAccountInfo(receiptAddress);

        if (receiptInfo) {
          const lender = new PublicKey(receiptInfo.data.subarray(48, 80));
          const [lenderBalanceAddress] = PublicKey.findProgramAddressSync(
            [Buffer.from("balance_4"), lender.toBuffer()],
            SPL_TOKEN_LENDING_PROGRAM_ID
          );

          await program?.methods
            .repay(new anchor.BN(receipt.sn))
            .accounts({
              receipt: receiptAddress,
              lenderBalance: lenderBalanceAddress,
              payer: publicKey,
              systemProgram: SystemProgram.programId,
            })
            .rpc();
        }

        onReceiptClose();
        setRepaying(false);
        getLendableBalance();
        getReceipts();
      }
    } catch (error: any) {
      notify("error", `Borrow failed: ${error?.message}`);
    } finally {
      setBorrowing(false);
    }
  }, [
    connected,
    connection,
    getLendableBalance,
    getReceipts,
    notify,
    onReceiptClose,
    program?.methods,
    publicKey,
    receipt,
  ]);

  useEffect(() => {
    getOrders();

    if (connected) {
      getBalance();
      getReceipts();
      getLendableBalance();
    }
  }, [connected, getLendableBalance, getBalance, getOrders, getReceipts]);

  return (
    <main className="container flex min-h-screen flex-col mx-auto py-4">
      <div className="w-full items-center justify-between text-sm flex">
        <code className="font-bold">CC LENDING</code>
        <WalletMultiButton className="rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500" />
      </div>
      <div className="grid grid-cols-2 gap-6 mt-16">
        <Card>
          <CardHeader>
            <p className="font-semibold ml-2">Deposit</p>
          </CardHeader>
          <CardBody className="flex-col justify-between text-small">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-slate-500">Balance</label>
                <p className="font-semibold text-slate-700">
                  {balance.toFixed(4)} SOL
                </p>
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
              isLoading={depositing}
              color={depositDisabled ? undefined : "primary"}
              disabled={depositDisabled}
              onClick={handleDeposit}
            >
              Deposit {depositValue ? `${depositValue} SOL` : ""}
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="font-semibold ml-2">Balance</p>
          </CardHeader>
          <CardBody className="flex-col justify-between pt-0 text-small">
            <div>
              <div className="flex py-2 items-center justify-between">
                <label className="text-slate-500">Lendable amount</label>
                <p className="font-semibold text-slate-700">
                  {lendableBalance.toFixed(4)} SOL
                </p>
              </div>
              <div className="flex py-2 items-center justify-between">
                <label className="text-slate-500">Monthly interest rate</label>
                <p className="font-semibold text-slate-700">1%</p>
              </div>
              <Input
                type="number"
                label={<label className="text-slate-500">Amount</label>}
                min={0}
                max={lendValue}
                fullWidth
                value={lendValue}
                onChange={(e) => setLendValue(e.target.value)}
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
              isLoading={lending}
              color={lendDisabled ? undefined : "primary"}
              disabled={lendDisabled}
              onClick={handleLend}
            >
              Lend {lendValue ? `${lendValue} SOL` : ""}
            </Button>
          </CardBody>
        </Card>
      </div>
      <h1 className="font-bold mt-16 mb-2">Receipts</h1>
      {!receiptLoading ? (
        <div className="grid grid-cols-3 gap-6">
          {receiptList.map((item) => (
            <Card key={`${item.sn}`}>
              <CardHeader>
                <Image
                  src="https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png"
                  className="w-6 h-6 rounded-full"
                  alt="solana"
                />
                <p className="font-semibold ml-2">Receipt</p>
              </CardHeader>
              <CardBody className="flex-col justify-between text-small pt-0">
                <div>
                  <div className="flex items-center justify-between py-2">
                    <label className="text-slate-500">Receipt SN</label>
                    <p className="font-semibold text-slate-700">{item.sn}</p>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <label className="text-slate-500">Lender</label>
                    <p className="font-semibold text-slate-700">
                      {getShortAddress(item.lender)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <label className="text-slate-500">Borrower</label>
                    <p className="font-semibold text-slate-700">
                      {getShortAddress(item.borrower)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <label className="text-slate-500">Amount</label>
                    <p className="font-semibold text-slate-700">
                      {item.amount.toFixed(4)} SOL
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <label className="text-slate-500">Rate</label>
                    <p className="font-semibold text-slate-700">
                      {item.rate / 100}%
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-6"
                  color={
                    Number(item.amount.toFixed(4)) === 0 || !connected
                      ? undefined
                      : "primary"
                  }
                  disabled={Number(item.amount.toFixed(4)) === 0 || !connected}
                  onClick={() => handleReceiptOpen(item)}
                >
                  Repay
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Spinner />
      )}
      <h1 className="font-bold mt-16 mb-2">Orders</h1>
      {orderList.length ? (
        <div className="grid grid-cols-3 gap-6">
          {orderList.map((item) => (
            <Card key={`${item.sn}`}>
              <CardHeader>
                <Image
                  src="https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png"
                  className="w-6 h-6 rounded-full"
                  alt="solana"
                />
                <p className="font-semibold ml-2">Order</p>
              </CardHeader>
              <CardBody className="flex-col justify-between text-small pt-0">
                <div>
                  <div className="flex items-center justify-between py-2">
                    <label className="text-slate-500">Order SN</label>
                    <p className="font-semibold text-slate-700">{item.sn}</p>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <label className="text-slate-500">Balance</label>
                    <p className="font-semibold text-slate-700">
                      {item.balance.toFixed(4)} SOL
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <label className="text-slate-500">Lender</label>
                    <p className="font-semibold text-slate-700">
                      {getShortAddress(item.lender)}
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-6"
                  color={
                    Number(item.balance.toFixed(4)) === 0 || !connected
                      ? undefined
                      : "primary"
                  }
                  disabled={Number(item.balance.toFixed(4)) === 0 || !connected}
                  onClick={() => handleOrderOpen(item)}
                >
                  Borrow
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Spinner />
      )}
      <Modal isOpen={isOpen} onClose={handleClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Borrow</ModalHeader>
              <ModalBody>
                <div className="flex items-center justify-between py-2">
                  <label className="text-slate-500">Order SN</label>
                  <p className="font-semibold text-slate-700">{order?.sn}</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <label className="text-slate-500">Balance</label>
                  <p className="font-semibold text-slate-700">
                    {order?.balance.toFixed(4)} SOL
                  </p>
                </div>
                <Input
                  type="number"
                  label={<label className="text-slate-500">Amount</label>}
                  min={0}
                  max={order?.balance.toFixed(4)}
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
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={handleClose}>
                  Close
                </Button>
                <Button
                  color={borrowDisabled ? undefined : "primary"}
                  disabled={borrowDisabled}
                  isLoading={borrowing}
                  onPress={handleBorrow}
                >
                  Borrow
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <Modal isOpen={isReceiptOpen} onClose={handleReceiptClose}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Return</ModalHeader>
              <ModalBody>
                <div className="flex items-center justify-between py-2">
                  <label className="text-slate-500">Receipt SN</label>
                  <p className="font-semibold text-slate-700">{receipt?.sn}</p>
                </div>
                <div className="flex items-center justify-between py-2">
                  <label className="text-slate-500">Amount</label>
                  <p className="font-semibold text-slate-700">
                    {receipt?.amount.toFixed(4)} SOL
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={handleReceiptClose}
                >
                  Close
                </Button>
                <Button
                  isLoading={repaying}
                  color="primary"
                  onPress={handleReceipt}
                >
                  Repay
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  );
}
