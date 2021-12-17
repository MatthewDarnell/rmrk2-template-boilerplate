require('dotenv').config()
import { Client } from 'pg'



const createDb = async () => {
    try {
        let client = new Client({
            user: process.env.PGUSER,
            host: process.env.PGHOST,
            password: process.env.PGPASSWORD,
            port: process.env.PGPORT,
        })

        await client.connect()
        const res = await client.query(`CREATE DATABASE ${process.env.DB}`);
        await client.end()
        return res
    } catch(e) {
        console.log("Db already exists?");
    }
};

const createSchema = async () => {
    console.log('creating schema')
    let client = new Client({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.DB,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT,
    })
    await client.connect()
    const schema = "CREATE TABLE IF NOT EXISTS nft_changes_2 (nft_id text, change_index integer, field text, old text, new text, caller text, block integer, opType text);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_nft_id_change_2 ON nft_changes_2 (nft_id, change_index);\n" +
        "CREATE TABLE IF NOT EXISTS nft_reactions_2 (nft_id text, reaction text, wallets jsonb);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_nft_id_reaction_2 ON nft_reactions_2 (nft_id, reaction);\n" +
        "CREATE TABLE IF NOT EXISTS nfts_2 (id text primary key, block integer, collection text, symbol text, priority jsonb, transferable integer, sn text, metadata text, owner text, rootowner text, forsale bigint, burned text, properties jsonb, pending text, updatedAtBlock integer);\n" +
        "CREATE TABLE IF NOT EXISTS nft_resources_2 (nft_id text, id text, pending boolean, src text, slot text, thumb text, theme jsonb, base text, parts jsonb, themeId text, metadata text);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_nft_id_resource_2 ON nft_resources_2 (nft_id, id);\n" +
        "CREATE TABLE IF NOT EXISTS nft_children_2 (nft_id text, id text, pending boolean, equipped text);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_nft_id_child_2 ON nft_children_2 (nft_id, id);\n" +
        "CREATE TABLE IF NOT EXISTS collection_changes_2 (collection_id text, change_index integer, field text, old text, new text, caller text, block integer, opType text);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_id_changes_2 ON collection_changes_2 (collection_id, change_index);\n" +
        "CREATE TABLE IF NOT EXISTS collections_2 (id text primary key, block integer, max int, issuer text, symbol text, metadata text, updatedAtBlock text);\n" +
        "CREATE TABLE IF NOT EXISTS bases_2 (id text primary key, block integer, symbol text, type text, issuer text, updatedAtBlock integer);\n" +
        "CREATE TABLE IF NOT EXISTS base_changes_2 (base_id text, change_index integer, field text, old text, new text, caller text, block integer, opType text);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_base_id_changes_2 ON base_changes_2 (base_id, change_index);\n" +
        "CREATE TABLE IF NOT EXISTS base_themes_2 (base_id text, theme_name text, theme jsonb);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_base_id_themes_2 ON base_themes_2 (base_id, theme_name);\n" +
        "CREATE TABLE IF NOT EXISTS base_parts_2 (base_id text, id text, type text, src text, z integer, equippable jsonb, themable boolean);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_base_id_parts_2 ON base_parts_2 (base_id, id);"

    let res = await client.query(schema);
    console.log(res)
    await client.end()
};
createDb().then(async () => {
    await createSchema()
})

