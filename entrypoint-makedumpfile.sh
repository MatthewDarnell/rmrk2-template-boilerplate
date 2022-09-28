#!/bin/bash
export NODE_OPTIONS=--max_old_space_size=4096;
NODE_OPTIONS=--max_old_space_size=4096 yarn create-dump consolidated-from-latest.json;
tar -czvf consolidated-from-latest.tar.gz ./consolidated-from-latest.json;
