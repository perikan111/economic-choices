<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# economic-choices プロジェクト規約

## 設計の一次情報

- `docs/game-design.md`
- `docs/scenario-format.md`
- `docs/architecture.md`

実装前に関連箇所を読み、既存設計と矛盾する変更を行わない。シナリオフォーマットを変更するときは、実装・テストと同時に `docs/scenario-format.md` も更新する。

## game-core の境界

`src/game-core/` では以下を禁止する。

- React / Next.js の import
- `window`、`document`、`localStorage`、その他のブラウザ API
- シナリオ固有のパラメータ名・フラグ名・シーン ID のハードコード

game-core は純粋 TypeScript とシリアライズ可能なデータだけで構成し、UI・ストレージ実装・個別シナリオから独立させる。

## 主要チェック

- `pnpm check:core`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
