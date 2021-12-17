
import { fetchRemarks, getRemarksFromBlocks, getLatestFinalizedBlock, Consolidator } from 'rmrk-tools';
import { ApiPromise, WsProvider } from '@polkadot/api';


export const fetchAndConsolidate = async () => {
    try {
        const wsProvider = new WsProvider('ws://127.0.0.1:9944');

        const api = await ApiPromise.create({ provider: wsProvider });
        const to = await getLatestFinalizedBlock(api);

        const remarkBlocks = await fetchRemarks(api, 0, to, ["0x726d726b", "0x524d524b"]);
        if (remarkBlocks) {
            const remarks = getRemarksFromBlocks(remarkBlocks, ["0x726d726b", "0x524d524b"]);

            const consolidator = new Consolidator();
            const { bases, collections, invalid, nfts } = await consolidator.consolidate(remarks);

            //@ts-ignore
            BigInt.prototype.toJSON = function () {
                return this.toString();
            };

            return {
                bases: JSON.stringify(bases),
                collections: JSON.stringify(collections),
                invalid: JSON.stringify(invalid),
                nfts: JSON.stringify(nfts),
            };
        }
    } catch (error) {
        console.log(error)
    }
}