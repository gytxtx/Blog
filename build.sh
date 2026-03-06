#!/usr/bin/env bash

#------------------------------------------------------------------------------
# @file
# Builds a MkDocs site hosted on a Cloudflare Worker.
#------------------------------------------------------------------------------

main() {
  # Setting Timezone
  export TZ=Asia/Shanghai

  # Install dependencies
  echo "Install dependencies..."
  python3 -m pip install --user -r requirements.txt
  export PATH="$HOME/.local/bin:$PATH"

  # Verify installations
  echo "Verifying installations..."
  echo Python: "$(python3 --version)"
  echo MkDocs: "$(mkdocs --version)"

  # Configure Git
  echo "Configuring Git..."
  git config core.quotepath false
  if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
    git fetch --unshallow
  fi

  # Build the site
  echo "Building the site..."
  mkdocs build --clean --strict

}

set -euo pipefail
main "$@"
