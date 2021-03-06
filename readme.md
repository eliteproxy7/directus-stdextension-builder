# directus-stdextension-builder

A fork of [extensions-sdk](https://github.com/directus/directus/tree/main/packages/extensions-sdk) (without scaffolding)
that builds many extensions for [Directus](https://directus.io) into multiple modules concurrently.

Uses [threads.js](https://threads.js.org/) for workers to bundle multiple components using [Rollup](https://rollupjs.org/) and [Babel](https://babeljs.io/)
into the following tree that is dynamically loaded by directus:

```
From (typescript or es5+):

-] src
 >-] extensions
  >-] displays
  >-] endpoints
  >-] hooks
  >-] interfaces
  >-] layouts
  >-] modules
  >-] panels

Compiled to:

-] extensions
 >-] displays
 >-] endpoints
 >-] hooks
 >-] interfaces
 >-] layouts
 >-] modules
 >-] panels
```

## Using

```
directus-stdextension-builder build <options>

Options:
 -i --input    <val>   | overwrite the default extensions sources folder (src/extensions/)
 -o --output   <val>   | overwrite the default output folder (extensions/)
 -l --language <val>   | overwrite the language to use
 -w --watch            | flag to watch and rebuild on changes
```

In package.json:

```json
{
  "scripts": {
    "build": "directus-stdextension-builder build",
    "start": "yarn build && yarn directus start"
  }
}
```

You may need to increase the "Old memory size" option in node before building.
Depending on your RAM you may need to try different sizes, with 8GB (8192MB):

```json
{
  "scripts": {
    "build": "export NODE_OPTIONS=--max-old-space-size=8192 && directus-stdextension-builder build"
  }
}
```

then:

```
yarn build
```