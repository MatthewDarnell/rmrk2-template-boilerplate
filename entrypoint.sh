#!/bin/sh
yarn create-db;
sleep 5;
export NODE_OPTIONS=--max_old_space_size=4096;
NODE_OPTIONS=--max_old_space_size=4096 yarn start;