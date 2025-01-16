install:
  npm install

wasm:
  AR=/opt/homebrew/opt/llvm/bin/llvm-ar \
  CC=/opt/homebrew/opt/llvm/bin/clang \
  wasm-pack build \
    --target web \
    --out-name bip322 \
    verify
  cp verify/pkg/bip322.js verify/pkg/bip322.d.ts verify/pkg/bip322_bg.wasm src

build: install wasm
  npm run build

run: install wasm
  npm run dev

lint: install
  npm run lint

serve: build
  python3 -m http.server -b 127.0.0.1 -d dist 8888
