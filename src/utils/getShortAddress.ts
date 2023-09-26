export const getShortAddress = (addr: string) =>
  addr.length > 10
    ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
    : addr;
