
import { fetchRemarks, getRemarksFromBlocks, Consolidator } from 'rmrk-tools';
import {addRemarkArray, getRemarks} from "../store/remarks";

export const fetch = async (api, from, to) => {
    try {
        const remarkBlocks = await fetchRemarks(api, from, to, ["0x726d726b", "0x524d524b"]);
        if (remarkBlocks) {
            return getRemarksFromBlocks(remarkBlocks, ["0x726d726b", "0x524d524b"]);
        }
        return []
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}

export const consolidate = async (api, r) => {
    try {
        let remarks = [...r]
        if(remarks.length > 0) {
            await addRemarkArray(remarks)
        }
        let storedRemarks = (await getRemarks())
        const consolidator = new Consolidator();
        const { bases, collections, invalid, nfts } = await consolidator.consolidate(storedRemarks);
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
    } catch (error) {
        console.log(error)
    }
}