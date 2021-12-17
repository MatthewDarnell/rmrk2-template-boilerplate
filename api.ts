
import { fetchRemarks, getRemarksFromBlocks, getLatestFinalizedBlock, Consolidator } from 'rmrk-tools';
import { ApiPromise, WsProvider } from '@polkadot/api';


export const init = () => {
    console.log("hi");
}


export const fetchAndConsolidate = async () => {
    try {
        const wsProvider = new WsProvider('ws://127.0.0.1:9944');

        const api = await ApiPromise.create({ provider: wsProvider });
        const to = await getLatestFinalizedBlock(api);

        const remarkBlocks = await fetchRemarks(api, 0, to, ["0x726d726b", "0x524d524b"]);
        if (remarkBlocks) {
            const remarks = getRemarksFromBlocks(remarkBlocks, ["0x726d726b", "0x524d524b"]);

            const consolidator = new Consolidator();
            const { nfts, collections } = await consolidator.consolidate(remarks);

            //@ts-ignore
            BigInt.prototype.toJSON = function () {
                return this.toString();
            };

           // console.log('Consolidated nfts:', JSON.stringify(nfts));

            console.log('Consolidated collections:', JSON.stringify(collections));
            return {
                nfts: JSON.stringify(nfts),
                collections: JSON.stringify(collections)
            };
        }
    } catch (error) {
        console.log(error)
    }
}