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
