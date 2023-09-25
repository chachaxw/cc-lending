This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Solana

### avm

Install `avm` using Cargo. Note this will replace your `anchor` binary if you had one installed.

```shell
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```

avm install anchor

```shell
avm install latest
avm use latest

anchor --version
```

### anchor

```shell
cargo install --git https://github.com/coral-xyz/anchor --tag v0.28.0 anchor-cli --locked
```

```
anchor deploy --provider.cluster devnet
```

### solana

```shell
sh -c "$(curl -sSfL https://release.solana.com/v1.16.13/install)"

# Generating a new keypair
```

### acount

```shell
solana-keygen new -o ./solana/id.json

solana address
```

```shell
solana config set --url localhost

solana config set --url devnet

solana balance

solana airdrop 1
```

### 程序

```
anchor init hello_world
```

config

```shell
solana config set --url localhost

solana config get

solana-test-validator
```

构建和部署

```
cargo build-sbf

tree -d 2 target/
```

```shell
solana program deploy <PATH>
# solana program deploy  target/deploy/hello_world.so
```

### 查看程序日志

```shell
solana logs <PROGRAM_ID>

solana logs DKtPpFnJoMn6qUFiPxWN61DJqFqPpYoGShrwaG2QJfRx
```

### 释放合约

```shell
solana program close
# 部署合约较耗SOL，用于合约的存储费用。如果合约不再使用，可以用命令释放掉合约，指定接收人，支付的SOL就会返还
```

```shell
solana program close  --buffers

Buffer Address                               | Authority                                    | Balance
ER5KN9u6uy9N8d2TPFLwUhuBXwmbz5TDYZuR9tiXctTu | HxJHFKt8nFxmXL8HVnD84YJFrsZmHC1ux9fgwm2awkS8 | 3.42752856 SOL
HczChndCYcydwemUsNqePGZzE139NnoVbnWZ6d8PQudE | HxJHFKt8nFxmXL8HVnD84YJFrsZmHC1ux9fgwm2awkS8 | 0.2798268 SOL
9PWdoUoZ2q76x7dZCWUqoabnpmGdEAh5xp5ub1bV9Pz5 | HxJHFKt8nFxmXL8HVnD84YJFrsZmHC1ux9fgwm2awkS8 | 0.2798268 SOL
8q9B696b3ZWVNTuikNsrwBfXRnew3hcqoKiBGzeD4uz9 | HxJHFKt8nFxmXL8HVnD84YJFrsZmHC1ux9fgwm2awkS8 | 0.2798268 SOL
```

---

https://www.backpack.app/

https://www.datawallet.com/crypto/how-to-get-solana-faucet-tokens

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
