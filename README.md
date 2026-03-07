# 歌手写真轮播插件

为 MoeKoeMusic 播放器添加歌手写真轮播功能，在全屏歌词界面展示歌手写真背景图并自动轮播。

<img width="1670" height="1111" alt="图片" src="https://github.com/user-attachments/assets/1e2249a3-521e-4406-b9c2-738aa7bd038b" />


## 功能特性

- 📸 **获取歌手写真**：从酷狗开放平台 API 获取高质量歌手写真图片
- 🔄 **自动轮播**：每 10 秒自动切换下一张写真图片
- 🎨 **平滑过渡**：使用双缓冲技术实现淡入淡出效果，避免闪烁
- 👥 **多歌手支持**：支持合唱歌曲，自动合并多个歌手的写真
- 🔍 **智能搜索**：自动搜索歌手 ID，无需手动配置
- 📱 **响应式设计**：适配不同屏幕尺寸和分辨率
- ✨ **高清显示**：优化图片渲染，确保写真清晰显示
- 🎵 **智能切换**：检测歌曲切换，自动更新对应歌手写真

## 安装方法

### 方法一：手动安装

1. 确保 MoeKoeMusic 已关闭
2. 将插件目录复制到 MoeKoeMusic 的插件目录：
   ```bash
   # macOS/Linux
   cp -r artist-wallpaper-rotation /path/to/MoeKoeMusic/plugins/extensions/
   
   # Windows
   xcopy /E /I artist-wallpaper-rotation "C:\path\to\MoeKoeMusic\plugins\extensions\artist-wallpaper-rotation"
   ```

3. 启动 MoeKoeMusic
4. 在设置中启用插件

### 方法二：通过应用内安装

1. 打开 MoeKoeMusic 设置
2. 进入「扩展管理」页面
3. 点击「打开插件目录」
4. 将 `artist-wallpaper-rotation` 文件夹复制到插件目录
5. 刷新页面或重启应用

## 使用说明

1. 播放任意歌曲
2. 点击播放器打开全屏歌词界面
3. 背景将自动显示歌手写真并开始轮播
4. 如果没有歌手写真，将回退到专辑封面

## 技术实现

### 架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Content Script │────▶│ Background Worker│────▶│  External APIs  │
│   (注入页面)     │◀────│  (IPC 通信)       │◀────│  (酷狗 API)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### 核心组件

- **manifest.json**: 插件配置文件（Manifest V3）
- **background.js**: Service Worker，处理与外部 API 的通信
- **content.js**: 注入到页面的脚本，实现写真轮播逻辑
- **styles.css**: 样式文件，提供平滑过渡效果

### 双缓冲机制

使用两个背景图层交替切换，实现平滑的淡入淡出效果：

```javascript
// 图层 1 (可见)          // 图层 2 (隐藏)
opacity: 1               opacity: 0
background: image1       background: image2

// 切换时
↓

// 图层 1 (隐藏)          // 图层 2 (可见)
opacity: 0               opacity: 1
background: image1       background: image2
```

## API 说明

### 获取歌手写真

```
GET https://openapicdnretry.kugou.com/kmr/v1/author/extend
Query Parameters:
  - fields_pack: allimages
  - authorimg_type: 2,3
  - entity_id: {歌手 ID}
```

### 搜索歌手 ID

```
GET http://127.0.0.1:6521/search
Query Parameters:
  - keywords: {歌手名称}
  - type: author
```

## 配置选项

在 `content.js` 中可以修改以下配置：

```javascript
const state = {
    rotationInterval: 10000,  // 轮播间隔（毫秒）
    // ... 其他配置
};
```

## 兼容性

- ✅ MoeKoeMusic v1.5.9
- ✅ Electron 20+
- ✅ Chrome Extension Manifest V3

## 故障排除

### 写真不显示

1. 检查网络连接
2. 确认歌手 ID 是否正确
3. 查看控制台错误信息

### 轮播卡顿

1. 减少轮播间隔时间
2. 检查图片加载速度
3. 清理浏览器缓存

### 多歌手写真重复

插件会自动去重，如果仍有重复，请清除 localStorage 后重试。

## 开发调试

1. 打开 MoeKoeMusic 开发者工具
2. 切换到 Console 标签
3. 查看 `[ArtistWallpaper]` 前缀的日志

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 致谢

- 感谢酷狗音乐开放平台提供的 API
- 感谢 MoeKoeMusic 项目团队
