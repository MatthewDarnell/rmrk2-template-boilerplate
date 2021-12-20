

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
        const query = `SELECT block, caller, remark FROM remarks WHERE remark LIKE '%${contains}%' ORDER BY id ASC`
        return (await db_get(query, ""))
    } catch(error) {
        console.error(`Error Getting Remarks Where Contains --- ${error}`)
        throw new Error(error)
    }
}

export const addRemarkArray = async remarks => {
    if(remarks.length <= 0) {
        return 0
    }
    let query = `INSERT INTO remarks(block, caller, interaction_type, version, remark, extra_ex) VALUES \n`;
    for(const remark of remarks) {
        let extra_ex = 'NULL'
        if(remark.extra_ex) {
            extra_ex = `'${remark.extra_ex}'`
        }
        query += `(${remark.block}, '${remark.caller}', '${remark.interaction_type}', '${remark.version}', '${remark.remark}', ${extra_ex}), \n`
    }
    query = query.substring(0, query.length-3)
    query += ';'
    await db_query(query, "")
}
