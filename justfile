watch +args='test':
  cargo watch --clear --exec '{{args}}'

clippy:
  cargo clippy --all --all-targets -- --deny warnings

ci: clippy 
  cargo fmt -- --check
  cargo test --all

fmt:
  cargo fmt --all

doc:
  cargo doc --all --open

outdated:
  cargo outdated -R --workspace

coverage:
  cargo llvm-cov

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
  git clone https://github.com/ordinals/ord.git tmp/release
  cd tmp/release
  git checkout {{ revision }}
  cargo publish
  cd ../..
  rm -rf tmp/release

