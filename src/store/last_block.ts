
import {db_get, db_query} from "../database";

export const getLastBlockScanned = async () => {
    try {
        const query = "SELECT lastblock FROM lastblock_2 ORDER BY lastblock DESC LIMIT 1"
        let result = (await db_get(query, ""))
        if(result.length < 1) {
            result = [ {  lastblock: 0 } ]
        }
        return result[0].lastblock
    } catch(error) {
        console.error(`Error Getting Last Block Scanned ${error}`)
        throw new Error(error)
    }
}

export const setLastBlockScanned = async (block) => {
    const query = `INSERT INTO lastblock_2 (lastblock) VALUES ($1);`;
    //should make this a transaction
    await db_query('TRUNCATE lastblock_2;', "")
    await db_query(query, [parseInt(block)])
}
