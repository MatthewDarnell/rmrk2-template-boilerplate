import { fetchRemarks, getRemarksFromBlocks, Consolidator } from 'rmrk-tools';
import { Remark } from "rmrk-tools/dist/tools/consolidator/remark";
import {addRemarkArray, getRemarks, getRemarksFromTo, getRemarksUpTo} from "../store/remarks";

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


export const consolidate = async (api, consolidator, isInitialRun, from, to, r = null) => {
    try {
        if(r) {
            let remarks = [...r]
            if(remarks.length > 0) {
                await addRemarkArray(remarks.filter(remark => remark.block > from))
            }
        }

        let storedRemarks
        if(isInitialRun) {
            storedRemarks = (await getRemarks()) || []
        } else {
            storedRemarks = (await getRemarksFromTo(from, to))
        }

        if(storedRemarks.length > 0) {
            console.log(`Consolidating ${storedRemarks.length} remarks`)
        }
        if(storedRemarks.length < 1) {
            return {
                bases: {},
                collections: {},
                invalid: [],
                changes: [],
                nfts: {}
            }
        }

        storedRemarks = storedRemarks.map(remark => {
            let r: Remark = remark
            if(r.extra_ex) {
                // @ts-ignore
                r.extra_ex = JSON.parse(r.extra_ex)
            }
            return r
        })

        const { bases, collections, invalid, nfts, changes } = await consolidator.consolidate(storedRemarks);

        BigInt.prototype["toJSON"] = function () {
            return this.toString();
        };

        return {
            bases,
            collections,
            invalid,
            nfts,
            changes
        };

    } catch (error) {
        console.log(error)
    }
}