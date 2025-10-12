#!/bin/sh
set -e

export NPM_CONFIG_PACKAGE_LOCK=false

npm install --no-package-lock

npm run dev


