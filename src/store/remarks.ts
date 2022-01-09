const crypto = require("crypto")

import {db_get, db_query} from "../database";

export const getRemarks = async () => {
    try {
        const query = "SELECT block, caller, interaction_type, version, remark, extra_ex FROM remarks ORDER BY id ASC"
        return (await db_get(query, ""))
    } catch(error) {
        console.error(`Error Getting Remarks ${error}`)
        throw new Error(error)
    }
}
export const getRemarksWhereContains = async contains => {
    try {
        const query = `SELECT block, caller, remark FROM remarks WHERE remark LIKE '%$1%' ORDER BY id ASC`
        return (await db_get(query, contains))
    } catch(error) {
        console.error(`Error Getting Remarks Where Contains --- ${error}`)
        throw new Error(error)
    }
}

export const addRemarkArray = async remarks => {
    try {
        if(remarks.length <= 0) {
            return 0
        }
        let insert = `INSERT INTO remarks(block, caller, interaction_type, version, remark, extra_ex, hash) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`;
        for(const remark of remarks) {
            let extra_ex
            let hash

            if(!remark.block || !remark.caller || !remark.interaction_type || !remark.version || !remark.remark) {
                continue
            }

            if(remark.extra_ex) {
                extra_ex = remark.extra_ex
                hash = crypto.createHash('sha256').update(JSON.stringify({
                    block: remark.block,
                    caller: remark.caller,
                    interaction_type: remark.interaction_type,
                    version: remark.version,
                    remark: remark.remark,
                    extra_ex
                })).digest('base64');
            } else {
                hash = crypto.createHash('sha256').update(JSON.stringify({
                    block: remark.block,
                    caller: remark.caller,
                    interaction_type: remark.interaction_type,
                    version: remark.version,
                    remark: remark.remark,
                })).digest('base64');
            }
            let params = [
                remark.block,
                remark.caller,
                remark.interaction_type,
                remark.version,
                remark.remark,
                extra_ex,
                hash
            ]

            await db_query(insert, params)
        }
    } catch(error) {
        console.error(`Error Adding Remark Array: ${error}`)
    }
}
