

# rmrk2-template-boilerplate

## What is this?

This is a template project which is intended for use as a base project, on which your [RMRK 2](https://www.rmrk.app/) Node.js NFT project can be built.

It is a *work in progress*.

It comes bundled with a postgres database for storing NFTs, a HTTP and Websocket server for fetching/subscribing to events and storage data, and a simple "UglyGui" for exploring the database and API.

## Getting Started

Have the latest `node` and `npm` installed.

Have `docker` and `docker-compose` installed.
```shell
apt install -y docker docker-compose
```

Start the Database: `npm run start-db`

Create the Database: `npm run create-db`

Run [Substrate](https://github.com/paritytech/substrate): `substrate --dev --tmp` (if using a dev node)

Start the app: `npm run start`


### Configuring the App

Check out the file `.env` for several environment variables used in the app.

You are able to set substrate endpoints, delay interval times for block scanner, db settings, ports and more

### API

This app contains both a HTTP (Express) Server as well as a Websocket (Socket.io) server.

The http api can be found in `src/api/routes/` and explored on the GUI

The socket api can be found in `src/api/socket.ts` and explored on the GUI

### GUI

`client/index.html` contains a simple GUI for exploring the apis. You can subscribe to socket events and make http requests.


### Runnable Scripts

Currently there are several runnable scripts:

```shell
npm run start 
npm run consolidated2db /path/to/consolidated
npm run unconsolidated2db /path/to/Unconsolidated
```

`consolidated2db` imports a RMRK2 dump into the db. (https://docs.rmrk.app/syncing/#download-dumps)

`unconsolidated2db` imports a RMRK2 unconsolidated dump into the db, consolidates, and then stores the resulting data.

### Note

This is a *work in progress*! It is working with local substrate chains, but is not yet able to successfully consolidate unconsolidated dump files from kusama without incurring invalids.
