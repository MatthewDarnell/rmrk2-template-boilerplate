#!/bin/bash
yarn create-db;
sleep 5;
export NODE_OPTIONS=--max_old_space_size=10240;
NODE_OPTIONS=--max_old_space_size=10240 yarn start;