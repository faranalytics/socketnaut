import * as pth from "node:path";
export const SSL_PATH = pth.join(pth.dirname(import.meta.dirname), "ssl");
export const KEY_PATH = pth.join(SSL_PATH, "key.pem");
export const CERT_PATH = pth.join(SSL_PATH, "cert.pem");
