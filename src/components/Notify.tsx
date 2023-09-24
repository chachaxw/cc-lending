import type { VariantType } from "notistack";
import { useSnackbar } from "notistack";
import React, { useCallback } from "react";
import { Link } from "@nextui-org/react";

export function useNotify() {
  const { enqueueSnackbar } = useSnackbar();

  return useCallback(
    (variant: VariantType, message: string, signature?: string) => {
      enqueueSnackbar(
        <div className="p-5">
          {message}
          {signature && (
            <Link
              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
              target="_blank"
            >
              Transaction
            </Link>
          )}
        </div>,
        { variant }
      );
    },
    [enqueueSnackbar]
  );
}
