import { KeyPairHelper } from './KeyPairHelper';
import { CryptoUtils } from '../CryptoUtils';
import { KeyPair } from './KeyPair';
import { Permissions } from './Permissions';
import DataRequest from '../../repository/models/DataRequest';
import { JsonUtils } from '../JsonUtils';
import { PermissionsSource } from '../../repository/assistant/PermissionsSource';
import { Site } from '../../repository/models/Site';
import { SiteDataSource } from '../../repository/assistant/SiteDataSource';

const bitcore = require('bitcore-lib');
const Message = require('bitcore-message');
const ECIES = require('bitcore-ecies');
const Mnemonic = require('bitcore-mnemonic');

export class BitKeyPair implements KeyPairHelper {

    private privateKey: any;
    private publicKey: any;
    private addr: any;
    private permissions: Permissions;
    private permissionsSource: PermissionsSource;
    private siteDataSource: SiteDataSource;
    private origin: string;

    constructor(permissionsSource: PermissionsSource, siteDataSource: SiteDataSource, origin: string) {
        this.permissions = new Permissions([]);
        this.permissionsSource = permissionsSource;
        this.siteDataSource = siteDataSource;
        this.origin = origin;
    }

    public createKeyPair(passPhrase: string): Promise<KeyPair> {
        return new Promise<KeyPair>(resolve => {
            const pbkdf2: string = CryptoUtils.PBKDF2(passPhrase, 256);
            const hash: any = bitcore.crypto.Hash.sha256(new bitcore.deps.Buffer(pbkdf2));
            const bn: any = bitcore.crypto.BN.fromBuffer(hash);
            this.privateKey = new bitcore.PrivateKey(bn);
            this.publicKey = this.privateKey.toPublicKey();
            this.addr = this.privateKey.toAddress();

            const privateKeyHex: string = this.privateKey.toString(16);
            const publicKeyHex = this.publicKey.toString(16);

            resolve(new KeyPair(privateKeyHex, publicKeyHex));
        });
    }

    public generateMnemonicPhrase(): Promise<string> {
        return new Promise<string>(resolve => {
            const mnemonic: string = new Mnemonic(Mnemonic.Words.ENGLISH).toString();

            resolve(mnemonic);
        });
    }

    public signMessage(data: string): Promise<string> {
        return new Promise<string>(resolve => {
            const message = new Message(data);

            resolve(message.sign(this.privateKey));
        });
    }

    public checkSig(data: string, sig: string): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            let result: boolean;

            try {
                result = Message(data).verify(this.privateKey.toAddress(), sig);
            } catch (e) {
                result = false;
            }
            resolve(result);
        });
    }

    public getPublicKey(): string {
        return this.publicKey.toString(16);
    }

    public getAddr(): string {
        return this.addr.toString(16);
    }

    public encryptMessage(recipientPk: string, message: string): Promise<string> {
        return new Promise<string>(resolve => {
            const ecies: any = new ECIES({noKey: true})
                .privateKey(this.privateKey)
                .publicKey(bitcore.PublicKey.fromString(recipientPk));

            resolve(ecies.encrypt(message)
                .toString('base64'));
        });
    }

    public async generatePasswordForField(fieldName: string): Promise<string> {
        if (this.permissions.fields.length === 0) {
            const site: Site = await this.siteDataSource.getSiteData(this.origin);
            if (!site.confidential) {
                const requests: Array<DataRequest> = await this.permissionsSource.getGrandAccessRecords(
                    site.publicKey, this.getPublicKey()
                );

                for (let request of requests) {
                    const strDecrypt: string = await this.decryptMessage(site.publicKey, request.responseData);
                    const jsonDecrypt = JSON.parse(strDecrypt);
                    const mapResponse: Map<string, string> = JsonUtils.jsonToMap(jsonDecrypt);
                    this.permissions.fields = Array.from(mapResponse.keys());
                }

            } else {
                this.permissions.fields = ['any'];
            }
        }

        const hasPermission = this.permissions.fields.indexOf(fieldName) > -1
            || this.permissions.fields.indexOf('any') > -1;

        return hasPermission
            ? new Promise<string>(resolve => {
                const result: string = CryptoUtils.PBKDF2(
                    CryptoUtils.keccak256(this.privateKey.toString(16)) + fieldName.toLowerCase(),
                    384
                );

                resolve(result);
            })
            : Promise.resolve('');
    }

    decryptMessage(senderPk: string, encrypted: string): Promise<string> {
        return new Promise<string>(resolve => {
            const ecies: any = new ECIES({noKey: true})
                .privateKey(this.privateKey)
                .publicKey(bitcore.PublicKey.fromString(senderPk));

            const result: string = ecies
                .decrypt(new Buffer(encrypted, 'base64'))
                .toString();

            resolve(result);
        });
    }

}
