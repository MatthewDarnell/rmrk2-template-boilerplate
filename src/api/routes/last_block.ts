import { getLastBlockScanned } from '../../store/last_block'

export const setupLastBlockRoute = app => {
    app.get('/get_last_block', async (req, res) => {
        try {
            const block = await getLastBlockScanned()
            console.log(block)
            res.status(200).send(JSON.stringify(block))
        } catch(error) {
            res.status(500).send(`Error getting last block ${error}`)
        }
    })
}