#!/bin/sh
echo "Building MacHTTP-js..."
echo "... docs ..."
npm run docs
echo "... package ..."
npm run package
echo "... macbuild ..."
npm run macbuild
echo "Done building."