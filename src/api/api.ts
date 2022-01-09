
import {fetchRemarks, getRemarksFromBlocks, Consolidator, RemarkListener} from 'rmrk-tools';
import {Remark} from "rmrk-tools/dist/tools/consolidator/remark";
import {addRemarkArray, getRemarks} from "../store/remarks";

export const fetch = async (api, from, to) => {
    try {
        const filters = ["0x726d726b", "0x524d524b"]
        const remarkBlocks = await fetchRemarks(api, from, to, filters);
        if (remarkBlocks) {
            return getRemarksFromBlocks(remarkBlocks, filters);
        }
        return []
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}

export const consolidate = async (api, from, r) => {
    try {
        let remarks = [...r]
        if(remarks.length > 0) {
            await addRemarkArray(remarks.filter(remark => remark.block > from))
        }
        let storedRemarks = (await getRemarks())
        storedRemarks = storedRemarks.map(remark => {
            let r: Remark = remark
            if(r.extra_ex) {
                // @ts-ignore
                r.extra_ex = JSON.parse(r.extra_ex)
            }
            return r
        })

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