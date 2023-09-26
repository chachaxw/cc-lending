import { createContext, useContext } from "react";
import {
  Program,
  AnchorProvider,
  Idl,
  setProvider,
} from "@project-serum/anchor";
import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import IDL from "../utils/idl.json";

const MockWallet = {
  publicKey: Keypair.generate().publicKey,
  signTransaction: () => Promise.reject(),
  signAllTransactions: () => Promise.reject(),
};

export const SPL_TOKEN_LENDING_PROGRAM_ID = new PublicKey(
  "5GQn3NDZgciJmNB85Az5V5FrAY64QddUWW9kKsRDLn2a"
);

const WorkspaceContext = createContext({});

interface Workspace {
  connection?: Connection;
  provider?: AnchorProvider;
  program?: Program<Idl>;
}

const WorkspaceProvider = ({ children }: any) => {
  const wallet = useAnchorWallet() || MockWallet;
  const { connection } = useConnection();

  const provider = new AnchorProvider(connection, wallet, {});
  setProvider(provider);

  const program = new Program(IDL as Idl, SPL_TOKEN_LENDING_PROGRAM_ID);
  const workspace = {
    connection,
    provider,
    program,
  };

  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
};

const useWorkspace = (): Workspace => {
  return useContext(WorkspaceContext);
};

export { WorkspaceProvider, useWorkspace };
