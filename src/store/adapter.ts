import { Base, Collection, NFT } from 'rmrk-tools';
import { IConsolidatorAdapter } from 'rmrk-tools/dist/tools/consolidator/adapters/types';
import { IStorageProvider } from "rmrk-tools/dist/listener";
import {
    BaseConsolidated,
    CollectionConsolidated,
    NFTConsolidated,
} from 'rmrk-tools/dist/tools/consolidator/consolidator';
import { AcceptEntityType } from 'rmrk-tools/dist/classes/accept';
import {getLastBlockScanned, setLastBlockScanned} from "./last_block";



//https://github.com/rmrk-team/rmrk-tools/blob/c1aeea53582eda0588e2b46ab96988b00f475370/cli/run-listener.ts#L12
export class StorageProvider implements IStorageProvider {
    readonly storageKey: string = "latestBlock";
    public latestBlock = 0;

    constructor(blockNum = 0) {

    }

    public set = async (latestBlock: number) => {
        await setLastBlockScanned(latestBlock)
    };

    public get = async () => {
        return await getLastBlockScanned()
    };
}


export class InMemoryAdapter implements IConsolidatorAdapter {
    public nfts: Record<string, NFTConsolidated>;
    public collections: Record<string, CollectionConsolidated>;
    public bases: Record<string, BaseConsolidated>;
    constructor(
        nfts: Record<string, NFTConsolidated>,
        collections: Record<string, CollectionConsolidated>,
        bases: Record<string, BaseConsolidated>,
    ) {
        this.nfts = nfts;
        this.collections = collections;
        this.bases = bases;
    }

    public async getAllNFTs() {
        return this.nfts;
    }

    public async getAllCollections() {
        return this.collections;
    }

    public async getAllBases() {
        return this.bases;
    }

    public async updateNFTEmote(nft: NFT, consolidatedNFT: NFTConsolidated) {
        this.nfts[consolidatedNFT.id] = {
            ...this.nfts[consolidatedNFT.id],
            reactions: nft?.reactions,
        };
    }

    public async updateBaseEquippable(base: Base, consolidatedBase: BaseConsolidated) {
        this.bases[consolidatedBase.id] = {
            ...this.bases[consolidatedBase.id],
            parts: base?.parts,
        };
    }

    public async updateNFTList(nft: NFT, consolidatedNFT: NFTConsolidated) {
        this.nfts[consolidatedNFT.id] = {
            ...this.nfts[consolidatedNFT.id],
            forsale: nft?.forsale,
            changes: nft?.changes,
        };
    }

    public async updateEquip(nft: NFT, consolidatedNFT: NFTConsolidated) {
        this.nfts[consolidatedNFT.id] = {
            ...this.nfts[consolidatedNFT.id],
            children: nft.children,
        };
    }

    public async updateSetPriority(nft: NFT, consolidatedNFT: NFTConsolidated) {
        this.nfts[consolidatedNFT.id] = {
            ...this.nfts[consolidatedNFT.id],
            priority: nft.priority,
        };
    }

    public async updateSetAttribute(nft: NFT, consolidatedNFT: NFTConsolidated) {
        this.nfts[consolidatedNFT.id] = {
            ...this.nfts[consolidatedNFT.id],
            properties: nft.properties,
        };
    }

    public async updateNftAccept(
        nft: NFT,
        consolidatedNFT: NFTConsolidated,
        entity: AcceptEntityType,
    ) {
        if (entity == 'NFT') {
            this.nfts[consolidatedNFT.id] = {
                ...this.nfts[consolidatedNFT.id],
                children: nft?.children,
                priority: nft?.priority || this.nfts[consolidatedNFT.id].priority,
            };
        } else if (entity === 'RES') {
            this.nfts[consolidatedNFT.id] = {
                ...this.nfts[consolidatedNFT.id],
                resources: nft?.resources,
                priority: nft?.priority || this.nfts[consolidatedNFT.id].priority,
            };
        }
    }

    public async updateNftResadd(nft: NFT, consolidatedNFT: NFTConsolidated) {
        this.nfts[consolidatedNFT.id] = {
            ...this.nfts[consolidatedNFT.id],
            resources: nft?.resources,
            priority: nft?.priority || this.nfts[consolidatedNFT.id].priority,
        };
    }

    public async updateNFTChildrenRootOwner(
        nft: NFT | NFTConsolidated,
        rootowner?: string,
        level?: number,
    ) {
        if ((level || 1) < 10 && nft.children && nft.children.length > 0) {
            const promises = nft.children.map(async (child) => {
                if (this.nfts[child.id]?.children && this.nfts[child.id]?.children.length > 0) {
                    await this.updateNFTChildrenRootOwner(
                        this.nfts[child.id],
                        rootowner || nft.rootowner,
                        (level || 1) + 1,
                    );
                }
                this.nfts[child.id] = {
                    ...this.nfts[child.id],
                    forsale: BigInt(0),
                    rootowner: rootowner || nft.rootowner,
                };
            });

            await Promise.all(promises);
        }
    }

    public async updateNFTBuy(nft: NFT, consolidatedNFT: NFTConsolidated) {
        this.nfts[consolidatedNFT.id] = {
            ...this.nfts[consolidatedNFT.id],
            owner: nft?.owner,
            rootowner: nft?.rootowner,
            changes: nft?.changes,
            forsale: nft?.forsale,
        };
    }

    public async updateNFTSend(nft: NFT, consolidatedNFT: NFTConsolidated) {
        this.nfts[consolidatedNFT.id] = {
            ...this.nfts[consolidatedNFT.id],
            changes: nft?.changes,
            owner: nft?.owner,
            rootowner: nft?.rootowner,
            forsale: BigInt(0),
            pending: nft?.pending,
        };
    }

    public async updateNFTBurn(nft: NFT | NFTConsolidated, consolidatedNFT: NFTConsolidated) {
        this.nfts[consolidatedNFT.id] = {
            ...this.nfts[consolidatedNFT.id],
            burned: nft?.burned,
            changes: nft?.changes,
            equipped: '',
            forsale: BigInt(nft.forsale) > BigInt(0) ? BigInt(0) : nft.forsale,
        };
    }

    public async updateNFTMint(nft: NFT) {
        this.nfts[nft.getId()] = {
            ...nft,
            symbol: nft.symbol,
            id: nft.getId(),
        };
    }

    public async updateCollectionMint(collection: CollectionConsolidated) {
        return (this.collections[collection.id] = collection);
    }

    public async updateBase(base: Base) {
        return (this.bases[base.getId()] = {
            ...base,
            id: base.getId(),
        });
    }

    public async updateBaseThemeAdd(base: Base, consolidatedBase: BaseConsolidated) {
        this.bases[consolidatedBase.id] = {
            ...this.bases[consolidatedBase.id],
            themes: base?.themes,
        };
    }

    public async updateCollectionIssuer(
        collection: Collection,
        consolidatedCollection: CollectionConsolidated,
    ) {
        this.collections[consolidatedCollection.id] = {
            ...this.collections[consolidatedCollection.id],
            issuer: collection?.issuer,
            changes: collection?.changes,
        };
    }

    public async updateBaseIssuer(base: Base, consolidatedBase: BaseConsolidated) {
        this.bases[consolidatedBase.id] = {
            ...this.bases[consolidatedBase.id],
            issuer: base?.issuer,
            changes: base?.changes,
        };
    }

    public async getNFTById(id: string) {
        return this.nfts[id];
    }

    public async getCollectionById(id: string) {
        return this.collections[id];
    }

    /**
     * Find existing NFT by id
     */
    public async getNFTByIdUnique(id: string) {
        return this.nfts[id];
    }

    public async getBaseById(id: string) {
        return this.bases[id];
    }
}