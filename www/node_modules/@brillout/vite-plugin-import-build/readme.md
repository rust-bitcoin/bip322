- [What is this?](#what-is-this)
- [Manual import](#manual-import)
- [What it does](#what-it-does)

&nbsp;


## What is this?

`@brillout/vite-plugin-import-build` automatically loads your server build (i.e. your files at `dist/server/`).

[Vike](https://vike.dev) and [Telefunc](https://telefunc.com) automatically add this plugin to your Vite app: there is nothing for you to do and you can usually ignore this plugin.

<p align="center"><sup><a href="#readme"><b>&#8679;</b> <b>TOP</b> <b>&#8679;</b></a></sup></p><br/>


## Manual import

Most of the time `@brillout/vite-plugin-import-build` is able to automatically import your server build (i.e. your files at `dist/server/`) &mdash; there is nothing for you to do.

But `@brillout/vite-plugin-import-build` doesn't work if you use Yarn PnP and you'll keep getting following error. The workaround is to manually import your server build.

```bash
# Yarn PnP users always get this error:
[@brillout/vite-plugin-import-build][Wrong Usage] Cannot find server build. (Re-)build your app
and try again. If you still get this error, then you may need to manually import the server build.
```

> [!WARNING]
> If you aren't using Yarn PnP and you keep getting this error, then it's a bug that should be fixed &mdash; please [open a new issue](https://github.com/brillout/vite-plugin-import-build/issues/new).

To manually import your server build:

```js
// server.js

// Load server build, see https://github.com/brillout/vite-plugin-import-build#manual-import
import './path/to/dist/server/importBuild.cjs'

// Your server code (Express.js, Vercel Serverless/Edge Function, Cloudflare Worker, ...)
// ...
```

Make sure to import `dist/server/importBuild.cjs` only in production. See [Conditional manual import](https://github.com/brillout/vite-plugin-import-build/issues/6) if your production and development share the same server entry file.

If you use [`vite.config.js` > `build.outDir`](https://vitejs.dev/config/build-options.html#build-outdir) then replace `dist/server/importBuild.cjs` with `${build.outDir}/server/importBuild.cjs`.

<p align="center"><sup><a href="#readme"><b>&#8679;</b> <b>TOP</b> <b>&#8679;</b></a></sup></p><br/>


## What it does

> [!NOTE]
> This section is meant for library authors. As a user, you don't need to read this. If you have a problem, read [Manual import](#Manual-import) instead or reach out to maintainers.

`@brillout/vite-plugin-import-build` does two things:
 - Generates an "import build" file at `dist/server/importBuild.cjs`.
 - Generates an "auto importer" file at `node_modules/@brillout/vite-plugin-import-build/dist/autoImporter.js`.

The *import build* file (`dist/server/importBuild.cjs`) enables tools, such as Vike and Telefunc, to consolidate their server entry file into a single entry file at `dist/server/importBuild.cjs`. We recommend having a quick look at the content of `dist/server/importBuild.cjs`: you'll see that it essentially loads built user files that live inside `dist/server/` (e.g. for Telefunc transpiled `.telefunc.js` user files, and for Vike transpiled `+Page.js` user files).

The *auto importer* file (`node_modules/@brillout/vite-plugin-import-build/dist/autoImporter.js`) automatically imports `dist/server/importBuild.cjs`, so that the user doesn't have to manually import `dist/server/importBuild.cjs` himself as shown in the following. That's the only purpose of the auto importer.

```js
// server/index.js (the user's server entry file)

// Without the auto importer, the user would have to manually import dist/server/importBuild.cjs
// in his server entry file like this:
if (process.env.NODE_ENV === 'production') {
  await import('../dist/server/importBuild.cjs')
}
```

See [How the auto importer works](https://github.com/brillout/vite-plugin-import-build/issues/4) to learn more.

<p align="center"><sup><a href="#readme"><b>&#8679;</b> <b>TOP</b> <b>&#8679;</b></a></sup></p><br/>
