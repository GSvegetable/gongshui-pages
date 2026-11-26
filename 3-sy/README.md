# 3_sy 双轨卡片空间（站点内托管的构建产物）

宫水.com 首页的第六个作品：3_sy 双轨卡片空间。首页把它整层铺在作品网格底下，
被上面五个作品卡片盖住 —— 卡片之间露出的那几段轨道就是它。

- **源码归属**：[GSvegetable/3_sy](https://github.com/GSvegetable/3_sy)（唯一实现，v0.18.0）
- **嵌入模式**：`?embed=1` —— 点卡片不翻面、自带搜索框与状态标签隐藏、底色透明、
  纵向滚动让给宿主页面、横向手势由首页转发进来（左右切换照常工作）。

本目录是构建产物（`npm run build` 的 `dist/`），不是源码；改动请回到上面那个仓库，
构建后覆盖这里：

```bash
git clone https://github.com/GSvegetable/3_sy.git
cd 3_sy && npm ci && npm run build
cp -r dist/. <站点仓库>/3-sy/
```

资源路径是相对的（`base: './'`），所以放在站点任意路径下都能正常加载。
