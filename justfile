watch +args='test':
  cargo watch --clear --exec '{{args}}'

clippy:
  cargo clippy --all --all-targets -- --deny warnings

ci: clippy 
  cargo fmt -- --check
  cargo test --all
  cargo run --example simple_sign_verify_encoded

fmt:
  cargo fmt --all

doc:
  cargo doc --all --open

outdated:
  cargo outdated -R --workspace

coverage:
  cargo llvm-cov

wasm:
  AR=/opt/homebrew/opt/llvm/bin/llvm-ar \
  CC=/opt/homebrew/opt/llvm/bin/clang \
  wasm-pack build \
    --target web \
    --out-name bip322 \
    www
  cp www/pkg/bip322.js www/pkg/bip322_bg.wasm www

serve: wasm 
  python3 -m http.server -b 127.0.0.1 -d www 8080

locks:
  #!/usr/bin/env bash
  set -euo pipefail
  for file in Cargo-minimal.lock Cargo-recent.lock; do
      cp "$file" Cargo.lock
      cargo check
      cp Cargo.lock "$file"
  done

prepare-release revision='master':
  #!/usr/bin/env bash
  set -euxo pipefail
  git checkout {{ revision }}
  git pull origin {{ revision }}
  echo >> CHANGELOG.md
  git log --pretty='format:- %s' >> CHANGELOG.md
  $EDITOR CHANGELOG.md
  $EDITOR Cargo.toml
  version=`sed -En 's/version[[:space:]]*=[[:space:]]*"([^"]+)"/\1/p' Cargo.toml | head -1`
  cargo check
  git checkout -b release-$version
  git add -u
  git commit -m "Release $version"
  gh pr create --web

publish-release revision='master':
  #!/usr/bin/env bash
  set -euxo pipefail
  rm -rf tmp/release
  git clone https://github.com/raphjaph/bip322.git tmp/release
  cd tmp/release
  git checkout {{ revision }}
  cargo publish
  cd ../..
  rm -rf tmp/release

