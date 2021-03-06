import RpcToken from './RpcToken';
import { Permissions } from '../Permissions';

export default class RpcAuth extends RpcToken {

    passPhrase: string;
    origin: string;
    expireDate: string;
    permissions: Permissions;

    constructor(accessToken: string = '',
                passPhrase: string = '',
                origin: string = '',
                expireDate: string = '',
                permissions: Permissions = new Permissions([])) {
        super(accessToken);
        this.passPhrase = passPhrase;
        this.origin = origin;
        this.expireDate = expireDate;
        this.permissions = permissions;
    }

}
