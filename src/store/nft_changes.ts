
import { db_query } from "../database";

//(nft_id text, change_index integer, field text, old text, new text, caller text, block integer, opType text);
export const addNftChanges = async (nftArray) => {
    const insert = "INSERT INTO nft_changes_2 (nft_id, change_index, field, old, new, caller, block, opType) VALUES ";
    let insertionValues = ""
    let totalChanges = 0
    for(let i = 0; i < nftArray.length; i++) {
        let nft = nftArray[i]
        nft.changes.map((change, index) => {
            let {
                field,
                old,
                caller,
                block,
                opType
            } = change
            insertionValues += `('${nft.id}', ${index}, '${field}', '${old}', '${change.new}', '${caller}', ${block}, '${opType}'), `
            totalChanges++
        })
    }

    let query = insert + insertionValues

    if(totalChanges > 0) {
        query = query.slice(0, query.length-2)
        query += ` ON CONFLICT (nft_id, change_index) DO UPDATE SET field = excluded.field, old = excluded.old, new = excluded.new, caller = excluded.caller, opType = excluded.opType;`
        return await db_query(query, "")
    }
    return 0
}