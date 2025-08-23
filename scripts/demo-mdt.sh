#!/usr/bin/env bash
set -euo pipefail

# Create an MDT branch
node ./bin/mdt.js run make_git_branch --json-params '{"prefix":"mdt/","taskContext":"demo","switchToBranch":false}'

# Analyze codebase
node ./bin/mdt.js analyze

# Generate node:test cases
node ./bin/mdt.js run generate_test_cases --json-params '{"sourceFiles":["src/index.ts"]}'

# Run tests with AI evaluation
node ./bin/mdt.js test --with-ai