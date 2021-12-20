import { getBaseById } from '../../store/base'

export const setupBaseRoutes = app => {
    app.get('/get_base_by_id/:id', async (req, res) => {
        try {
            const id = req.params.id
            const base = await getBaseById(id)
            res.status(200).send(JSON.stringify(base))
        } catch(error) {
            res.status(500).send(`Error getting base by id ${error}`)
        }
    })
}