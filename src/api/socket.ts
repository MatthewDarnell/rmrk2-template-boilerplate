import { Server } from 'socket.io'
import { getServer } from "./server";

export const io = new Server(getServer(),
    {
        cors: {
            origin: process.env.SOCKETCORS || "*"
        }
    });

console.log(`Initializing Socket.io Server`)



const defaultApi =  '["new_block", "new_base_change", "new_base_part", "new_base_theme", ' +
    '"new_base", "new_collection_change", "new_collection", "new_invalid", "new_nft_change", ' +
    '"new_nft_children", "new_nft_reaction", "new_nft_resource", "new_nft"]'

export const getApiFromTableName = tbl => {
    switch (tbl) {
        case 'lastblock_2': return 'new_block';
        case 'base_changes_2': return 'new_base_change';
        case 'base_parts_2': return 'new_base_part';
        case 'base_themes_2': return 'new_base_theme';
        case 'bases_2': return 'new_base';
        case 'collection_changes_2': return 'new_collection_change'
        case 'collections_2': return 'new_collection'
        case 'invalid_2': return 'new_invalid'
        case 'nft_changes_2': return 'new_nft_change'
        case 'nft_children_2': return 'new_nft_children'
        case 'nft_reactions_2': return 'new_nft_reaction'
        case 'nft_resources_2': return 'new_nft_resource'
        case 'nfts_2': return 'new_nft'
        default: return 'unknown'
    }
}


const verifySubscription = subscription => {
    try {
        let validSubscriptions = process.env.APIEVENTS.split(', ') || JSON.parse(defaultApi)
        return validSubscriptions.filter(x => x === subscription).length > 0
    } catch(error) {
        console.error(`Could not find valid json env var APIEVENTS, falling back to default Api`)
        return JSON.parse(defaultApi).filter(x => x === subscription).length > 0
    }
}
export const startSocketApi = () => {
    io.sockets.on('connection', socket => {
        console.log('got connection')
        socket.on('api', () => {
            socket.emit('api', JSON.stringify(process.env.APIEVENTS.split(', ')) || defaultApi)
        })
        socket.on('subscribe', subscription => {
            if (!verifySubscription(subscription)) {
                return socket.emit('subscribe', {error: 'Invalid Api Subscription'})
            }
            socket.emit('subscribe', {message: `Joining Room ${subscription}`})
            socket.join(subscription)
        })
    })

    io.sockets.on('disconnect', () => {
        console.log('disconnected')
        io.sockets.disconnectSockets(true);
    })
}

export const emitSubscriptionEvent = (event, data) => {
    console.log(`emitting event ${event}`)
    io.sockets.in(event).emit('event', {event, data})
}
