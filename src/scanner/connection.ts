
import { ApiPromise, WsProvider } from '@polkadot/api';

export const getConnection = async wsUrl => {
    try {
        const ws = new WsProvider(wsUrl || 'ws://127.0.0.1:9944');
        return ApiPromise.create({ provider: ws });
    } catch(error) {
        console.error(`Error Getting WS Connection 😡.(${wsUrl}) - ${error}`)
        throw new Error(error)
    }
}

