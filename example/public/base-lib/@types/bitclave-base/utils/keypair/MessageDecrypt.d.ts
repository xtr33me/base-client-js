export interface MessageDecrypt {
    decryptMessage(senderPk: string, encrypted: string): Promise<string>;
}
