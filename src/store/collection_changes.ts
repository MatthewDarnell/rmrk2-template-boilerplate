
import { db_query } from "../database";

export const addCollectionChanges = async (collection) => {
    const insert = "INSERT INTO collection_changes_2 (collection_id, change_index, field, old, new, caller, block, opType) VALUES ";
    let insertionValues = ""

    let totalChanges = 0

    let { changes, id } = collection
    if(changes.length > 0) {
        changes.map((change, change_index) => {
            let {
               field,
               old,
               caller,
               block,
               opType
            } = change
            insertionValues += `('${id}', ${change_index}, , '${field}', '${old}', '${change.new}', '${caller}', ${block}, '${opType}'), `;
            totalChanges++
        })
    }

    if(totalChanges > 0) {
        insertionValues = insertionValues.slice(0, insertionValues.length-2)
        insertionValues += ` ON CONFLICT (collection_id, change_index) DO UPDATE SET field = excluded.field, old = excluded.old, new = excluded.new, caller = excluded.caller, opType = excluded.opType;`
        return await db_query(insert + insertionValues, "")
    }
    return 0
}