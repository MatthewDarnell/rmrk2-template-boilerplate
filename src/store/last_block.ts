
import {db_get, db_query} from "../database";

export const getLastBlockScanned = async () => {
    const query = "SELECT lastblock FROM lastblock_2 ORDER BY lastblock DESC LIMIT 1"
    return (await db_get(query, "")).lastblock

}

export const setLastBlockScanned = async block => {
    const query = `TRUNCATE lastblock_2; INSERT INTO lastblock_2 (lastblock) VALUES (${parseInt(block)});`;
    await db_query(query, "")
}
