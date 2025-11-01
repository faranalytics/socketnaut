import * as net from "node:net";

export interface ProxySocketAddressInfo {
  local: net.AddressInfo;
  remote: net.AddressInfo;
}
