import {addNftMetadata, getNftMetadataIpfsLink, getNumNftMetadataIpfsLink} from "../store/nft";


let index = 0
const fetchMetadataLoop = async () => {
    let num = await getNumNftMetadataIpfsLink()
    if(index % 100 === 0) {
        console.log(`Number of Unfetched Metadatas Remaining: ${num}`)
        index = 0
    }
    index++
    const nfts = await getNftMetadataIpfsLink(
        process.env.IPFS_NUM_LINKS_FETCH ?
            process.env.IPFS_NUM_LINKS_FETCH : 1
    );
    for(const nft of nfts) {
        const { id, metadata } = nft
        await addNftMetadata(id, 0, metadata)
    }
    return setTimeout(
        fetchMetadataLoop,
        process.env.IPFS_FETCH_TIMEOUT ?
            parseInt(process.env.IPFS_FETCH_TIMEOUT) : 1000
    );
}


export const startMetadataFetcher = async () => {
    console.log('Starting Metadata Fetcher');
    return fetchMetadataLoop();
}