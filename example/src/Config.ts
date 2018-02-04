export default class Config {

    private static isDebug: boolean = true;

    public static getBaseEndPoint(): string {
        return this.isDebug ? 'https://base2-bitclva-com.herokuapp.com/' : '';
    }

}