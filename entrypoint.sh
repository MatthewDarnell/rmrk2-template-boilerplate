#!/bin/bash
yarn create-db;
sleep 2;
export NODE_OPTIONS=--max_old_space_size=8192;
NODE_OPTIONS=--max_old_space_size=8192 yarn start;