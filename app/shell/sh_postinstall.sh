#!/bin/bash
export PATH=/usr/local/bin:/usr/local/sbin:$PATH
echo "Running MacHTTP-js postinstall..."
pwd
bower install --allow-root --config.interactive=false
cp ./_static/stylesheets/bootstrap*.min.css ./_static/lib/bootstrap/dist/css/
echo "MacHTTP-js postinstall complete."
