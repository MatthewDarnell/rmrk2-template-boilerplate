
import { db_query } from "../database";

export const addInvalid = async (invalidArray, startBlock) => {
    const insert = "INSERT INTO invalid_2 (invalid_index, op_type, block, caller, object_id, message) VALUES ";
    let insertionValues = ""
    let totalInvalids = 0

    invalidArray = JSON.parse(invalidArray)

    for(let i = 0; i < invalidArray.length; i++) {
        let invalid = invalidArray[i]
        if(parseInt(invalid.block) > parseInt(startBlock)) {
            let {
                op_type,
                block,
                caller,
                object_id,
                message
            } = invalid
            insertionValues += `('${i}', '${op_type}', ${block}, '${caller}', '${object_id}', ${message}), `;
            totalInvalids++

        }
    }
    if(totalInvalids > 0) {
        insertionValues = insertionValues.slice(0, insertionValues.length-2)
        insertionValues += ` ON CONFLICT (invalid_index) DO UPDATE SET op_type = excluded.op_type, block = excluded.block, caller = excluded.caller, object_id = excluded.object_id, message = excluded.message;`
        return await db_query(insert + insertionValues, "")
    }
    return 0
}
