require('dotenv').config()
import { Client } from 'pg'

const conn = {
    user: process.env.PGUSER || "rmrk",
    host: process.env.PGHOST || "localhost",
    password: process.env.PGPASSWORD || "password",
    port: parseInt(process.env.PGPORT || "3000"),
}




const createDb = async () => {
    try {
        let client = new Client(conn)
        await client.connect()
        const res = await client.query(`CREATE DATABASE ${process.env.DB}`);
        console.log(`Creating `)
        console.log(conn)
        await client.query(`ALTER USER ${process.env.PGUSER} WITH ENCRYPTED PASSWORD '${process.env.PGPASSWORD}'`)
        await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${process.env.DB} TO ${process.env.PGUSER}`)
        await client.end()
        return res
    } catch(e) {
        console.log(`Db already exists?: ${e}`);
    }
};

const createSchema = async () => {
    console.log('creating schema')
    let client = new Client(conn)
    await client.connect()

    const notify = "CREATE OR REPLACE FUNCTION notify()\n" +
        "    RETURNS TRIGGER AS $$\n" +
        "DECLARE\n" +
        "    resVal text;\n" +
        "BEGIN\n" +
        "   IF (TG_OP = 'INSERT') THEN \n" +
        "      resVal := json_build_object('tbl', TG_TABLE_NAME::text, 'row', row_to_json(NEW.*));\n" +
        "      PERFORM pg_notify('insert_notify', resVal::text);\n" +
        "      RETURN NEW;\n" +
        "    END IF;" +
        "    RETURN NULL;" +
        "END;\n" +
        "$$ LANGUAGE plpgsql;\n" +

    "CREATE OR REPLACE TRIGGER nft_changes_trigger AFTER INSERT ON nft_changes_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +
    "CREATE OR REPLACE TRIGGER nft_children_trigger AFTER INSERT ON nft_children_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +
    "CREATE OR REPLACE TRIGGER nft_reactions_trigger AFTER INSERT ON nft_reactions_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +
    "CREATE OR REPLACE TRIGGER nft_resources_trigger AFTER INSERT ON nft_resources_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +
    "CREATE OR REPLACE TRIGGER nft_trigger AFTER INSERT ON nfts_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +

    "CREATE OR REPLACE TRIGGER base_trigger AFTER INSERT ON bases_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +
    "CREATE OR REPLACE TRIGGER base_part_trigger AFTER INSERT ON base_parts_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +
    "CREATE OR REPLACE TRIGGER base_theme_trigger AFTER INSERT ON base_themes_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +
    "CREATE OR REPLACE TRIGGER base_change_trigger AFTER INSERT ON base_changes_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +

    "CREATE OR REPLACE TRIGGER collection_trigger AFTER INSERT ON collections_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +
    "CREATE OR REPLACE TRIGGER collection_change_trigger AFTER INSERT ON collection_changes_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +

    "CREATE OR REPLACE TRIGGER invalid_trigger AFTER INSERT ON invalid_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n" +
    "CREATE OR REPLACE TRIGGER lastblock_trigger AFTER INSERT ON lastblock_2 FOR EACH ROW EXECUTE PROCEDURE notify();\n";

    const schema = "CREATE TABLE IF NOT EXISTS nft_changes_2 (nft_id text, change_index integer, field text, old text, new text, caller text, block integer, opType text);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_nft_id_change_2 ON nft_changes_2 (nft_id, change_index, block);\n" +
        "CREATE TABLE IF NOT EXISTS nft_reactions_2 (nft_id text, reaction text, wallets jsonb);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_nft_id_reaction_2 ON nft_reactions_2 (nft_id, reaction);\n" +
        "CREATE TABLE IF NOT EXISTS nfts_2 (id text primary key, block integer, collection text, symbol text, priority jsonb, transferable integer, sn text, metadata text, owner text, rootowner text, forsale bigint, burned text, properties jsonb, pending text, updatedAtBlock integer);\n" +
        "CREATE TABLE IF NOT EXISTS nft_resources_2 (nft_id text, id text, pending boolean, src text, slot text, thumb text, theme jsonb, base text, parts jsonb, themeId text, metadata text);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_nft_id_resource_2 ON nft_resources_2 (nft_id, id);\n" +
        "CREATE TABLE IF NOT EXISTS nft_children_2 (nft_id text, id text, pending boolean, equipped text);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_nft_id_child_2 ON nft_children_2 (nft_id, id);\n" +
        "CREATE TABLE IF NOT EXISTS collection_changes_2 (collection_id text, change_index integer, field text, old text, new text, caller text, block integer, opType text);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_id_changes_2 ON collection_changes_2 (collection_id, change_index, block);\n" +
        "CREATE TABLE IF NOT EXISTS collections_2 (id text primary key, block integer, max int, issuer text, symbol text, metadata text, updatedAtBlock text);\n" +
        "CREATE TABLE IF NOT EXISTS bases_2 (id text primary key, block integer, symbol text, type text, issuer text, updatedAtBlock integer);\n" +
        "CREATE TABLE IF NOT EXISTS base_changes_2 (base_id text, change_index integer, field text, old text, new text, caller text, block integer, opType text);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_base_id_changes_2 ON base_changes_2 (base_id, change_index, block);\n" +
        "CREATE TABLE IF NOT EXISTS base_themes_2 (base_id text, theme_name text, theme jsonb);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_base_id_themes_2 ON base_themes_2 (base_id, theme_name);\n" +
        "CREATE TABLE IF NOT EXISTS base_parts_2 (base_id text, id text, type text, src text, z integer, equippable jsonb, themable boolean);\n" +
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_base_id_parts_2 ON base_parts_2 (base_id, id);\n"+
        "CREATE TABLE IF NOT EXISTS invalid_2 (invalid_index integer primary key, op_type text, block integer, caller text, object_id text, message text);\n"+
        "CREATE TABLE IF NOT EXISTS lastBlock_2 (lastBlock integer);\n" +
        "CREATE TABLE IF NOT EXISTS remarks (id serial, block integer, caller text, interaction_type text, version text, remark text, extra_ex text, hash text UNIQUE);"
        //"CREATE UNIQUE INDEX remarks_extra_ex_unq_idx ON remarks (block, caller, interaction_type, version, remark, extra_ex) WHERE extra_ex IS NOT NULL";
    console.log(schema)
    await client.query(schema);
    console.log(notify)
    await client.query(notify);
    await client.end()
};
createDb().then(async () => {
    await createSchema()
    console.log('Done!')
    process.exit(0)
})

