#! /usr/bin/env

npm run lint
npm run docs
git add .
echo $1
git commit -m "$1"