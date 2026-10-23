# cube-toggler-3d

回転する立方体と、その周りに並べた小さな球との衝突判定をリアルタイムに確認できる 3D デモです。Three.js と Vue 3 で作っています。

デモ: https://nagata-minoru.github.io/cube-toggler-3d/

## 画面の構成

- 一辺 10 の立方体 (初期状態はワイヤフレーム表示)
- 立方体を囲むように 10 × 10 × 10 個並べた小さな球
- 床とグリッド、影を落とす平行光源

マウスのドラッグで視点を回転、ホイールでズームできます (OrbitControls)。

## 衝突判定

毎フレーム、各球の中心が立方体の内側にあるかを判定し、内側の球を**赤**、外側の球を**青**で表示します。立方体を回転させると、角の出入りに応じて色の境目が変わります。

判定には **OBB (Oriented Bounding Box)** を使っています。立方体の形から作った OBB に、毎フレーム立方体の現在の向きと位置 (ワールド行列) を適用するため、回転した状態でも正確に判定できます。

## 操作パネル

画面左上のパネルで次の操作ができます。

| 操作 | 内容 |
|---|---|
| ワイヤフレーム表示 | 立方体の表示をワイヤフレームと面表示で切り替える |
| CameraHelper 表示 | 影を作る光源の撮影範囲を表示する |
| X軸で回転 / Y軸で回転 / Z軸で回転 | オンにした軸のまわりに、1 フレームあたり 0.01 rad ずつ立方体を回転させる (複数同時に指定可) |
| ローテーションリセット | 立方体の向きを初期状態に戻す |

## 構成

| パス | 内容 |
|---|---|
| `src/components/CubeComponent.vue` | シーンの構築、アニメーション、衝突判定、操作パネル |
| `tests/unit/CubeComponent.spec.ts` | `CubeComponent` のテスト (Vitest) |
| `.github/workflows/ci.yml` | CI (lint・型チェック・テスト・ビルド) と GitHub Pages へのデプロイ |

## デプロイ

`main` ブランチに push すると、CI のチェックがすべて通った後に GitHub Actions が GitHub Pages へ自動でデプロイします。手動で再デプロイする場合は、Actions の CI ワークフローを `workflow_dispatch` で実行します。

## Project setup
This project uses Yarn 4 via [Corepack](https://github.com/nodejs/corepack).
On Node.js 25 or later, install Corepack first (`npm install -g corepack`).
```
corepack enable
yarn install
```

### Compiles and hot-reloads for development
```
yarn dev
```

### Compiles and minifies for production (outputs to `dist/`)
```
yarn build
```

### Runs unit tests
```
yarn test
```

### Type-checks files
```
yarn type-check
```

### Lints files
```
yarn lint
```

### Customize configuration
See [Vite Configuration Reference](https://vite.dev/config/).
