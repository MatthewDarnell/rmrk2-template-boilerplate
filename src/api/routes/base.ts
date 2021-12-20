import { getBases, getBaseById, getBaseChangesById, getBasePartsById, getBaseThemesById} from '../../store/base'

export const setupBaseRoutes = app => {
    app.get('/get_bases', async (req, res) => {
        try {
            const bases = await getBases()
            res.status(200).send(JSON.stringify(bases))
        } catch(error) {
            res.status(500).send(`Error getting bases ${error}`)
        }
    })
    app.get('/get_base_by_id/:id', async (req, res) => {
        try {
            const id = req.params.id
            const base = await getBaseById(id)
            res.status(200).send(JSON.stringify(base))
        } catch(error) {
            res.status(500).send(`Error getting base by id ${error}`)
        }
    })

    app.get('/get_base_changes_by_id/:id', async (req, res) => {
        try {
            const id = req.params.id
            const base = await getBaseChangesById(id)
            res.status(200).send(JSON.stringify(base))
        } catch(error) {
            res.status(500).send(`Error getting base changes by id ${error}`)
        }
    })

    app.get('/get_base_parts_by_id/:id', async (req, res) => {
        try {
            const id = req.params.id
            const base = await getBasePartsById(id)
            res.status(200).send(JSON.stringify(base))
        } catch(error) {
            res.status(500).send(`Error getting base parts by id ${error}`)
        }
    })

    app.get('/get_base_themes_by_id/:id', async (req, res) => {
        try {
            const id = req.params.id
            const base = await getBaseThemesById(id)
            res.status(200).send(JSON.stringify(base))
        } catch(error) {
            res.status(500).send(`Error getting base themes by id ${error}`)
        }
    })
}