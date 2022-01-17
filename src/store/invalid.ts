
import {db_get, db_query} from "../database";

export const getInvalids = async () => {
    const query = `SELECT * FROM invalid_2`
    return (await db_get(query, ""))
}

export const getInvalidsByOpType = async op => {
    const query = `SELECT * FROM invalid_2 WHERE op_type=$1`
    return (await db_get(query, [op]))
}

export const getInvalidsByCaller = async caller => {
    const query = `SELECT * FROM invalid_2 WHERE caller=$1`
    return (await db_get(query, [caller]))
}

export const addInvalid = async (invalidArray, startBlock) => {
    try {
        const insert = "INSERT INTO invalid_2 (invalid_index, op_type, block, caller, object_id, message) VALUES " +
                        " ($1, $2, $3, $4, $5, $6) " +
                        " ON CONFLICT (invalid_index) DO UPDATE SET op_type = excluded.op_type, block = excluded.block, " +
                        "caller = excluded.caller,  object_id = excluded.object_id, message = excluded.message;";

        let totalInvalids = 0

        invalidArray = JSON.parse(invalidArray)
        for(let i = 0; i < invalidArray.length; i++) {
            let invalid = invalidArray[i]
            if(invalid.block < startBlock) {
                continue
            }
            let {
                op_type,
                block,
                caller,
                object_id,
                message
            } = invalid

            let insertionValues = [
                i,
                op_type,
                block,
                caller,
                object_id,
                message
            ]
            totalInvalids++
            await db_query(insert, insertionValues)
        }
        return totalInvalids
    } catch(error) {
        console.error(`Error adding Invalid : ${error}`)
        throw new Error(error)
    }
}
