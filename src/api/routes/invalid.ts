import { getInvalids, getInvalidsByCaller, getInvalidsByOpType } from '../../store/invalid'

export const setupInvalidRoute = app => {
    app.get('/get_invalids', async (req, res) => {
        try {
            const invalids = (await getInvalids())
            res.status(200).send(JSON.stringify(invalids))
        } catch(error) {
            res.status(500).send(`Error getting last block ${error}`)
        }
    })

    app.get('/get_invalids_by_op_type/:op', async (req, res) => {
        try {
            const op = req.params.op
            const invalids = (await getInvalidsByOpType(op))
            res.status(200).send(JSON.stringify(invalids))
        } catch(error) {
            res.status(500).send(`Error getting last block ${error}`)
        }
    })

    app.get('/get_invalids_by_caller/:caller', async (req, res) => {
        try {
            const caller = req.params.caller
            const invalids = (await getInvalidsByCaller(caller))
            res.status(200).send(JSON.stringify(invalids))
        } catch(error) {
            res.status(500).send(`Error getting last block ${error}`)
        }
    })
}