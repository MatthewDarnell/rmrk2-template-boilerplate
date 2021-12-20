import { getCollectionById } from '../../store/collection'

export const setupCollectionRoutes = app => {
    app.get('/get_collection_by_id/:id', async (req, res) => {
        try {
            const id = req.params.id
            const collection = await getCollectionById(id)
            res.status(200).send(JSON.stringify(collection))
        } catch(error) {
            res.status(500).send(`Error getting collection by id ${error}`)
        }
    })
}