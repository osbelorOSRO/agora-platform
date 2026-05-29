#!/bin/sh
set -e

exec node --require ./dist/tracing.js dist/main.js
