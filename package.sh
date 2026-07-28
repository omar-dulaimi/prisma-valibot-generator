#!/bin/bash
# Without this, a failing `npx tsc` below is ignored: `rm -rf lib` has already run, `cp -r lib` then
# fails with "No such file or directory", and the script still exits 0 because `echo` is last. The
# release job would go on to publish a package with no lib/ in it.
set -euo pipefail

START_TIME=$SECONDS

echo "Building package..."
rm -rf lib
npx tsc
rm -rf package
mkdir package

echo "Copying files..."
cp -r lib package/lib
cp package.json README.md LICENSE package

echo "Making package.json public..."
sed -i 's/"private": true/"private": false/' ./package/package.json

ELAPSED_TIME=$(($SECONDS - $START_TIME))
echo "Done in $ELAPSED_TIME seconds!"
