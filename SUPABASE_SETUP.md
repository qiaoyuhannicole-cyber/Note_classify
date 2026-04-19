# Supabase 配置指南

本项目支持两种数据存储模式：
- **本地模式（默认）**：使用IndexedDB，数据存储在浏览器本地，无需配置
- **云端模式**：使用Supabase，支持多用户登录和数据同步

## 启用云端模式

### 1. 创建Supabase项目

1. 访问 [supabase.com](https://supabase.com)
2. 注册/登录账号
3. 点击 "New Project" 创建新项目
4. 填写项目信息：
   - Name: `wenjing`（或您喜欢的名称）
   - Database Password: 设置强密码并保存
   - Region: 选择离您最近的区域
5. 点击 "Create new project"，等待项目创建完成

### 2. 获取API密钥

1. 进入项目后，点击左侧菜单 "Project Settings" -> "API"
2. 复制以下信息：
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public**: `eyJ...`（长字符串）

### 3. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=你的项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon密钥
```

示例：
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. 执行数据库迁移

1. 进入Supabase项目，点击左侧菜单 "SQL Editor"
2. 点击 "New Query"
3. 复制 `supabase/migrations/001_initial_schema.sql` 文件的内容
4. 粘贴到SQL编辑器中
5. 点击 "Run" 执行SQL脚本

### 5. 重启开发服务器

```bash
npm run dev
```

### 6. 测试登录功能

1. 访问应用，会自动跳转到登录页面
2. 点击 "注册" 标签
3. 输入邮箱和密码（密码至少6位）
4. 点击 "注册" 按钮
5. 登录后即可使用应用

## 数据迁移

如果您之前使用本地模式，可以将数据迁移到云端：

1. 使用应用的导出功能导出数据
2. 导出的JSON文件包含所有问题、分类、关系等数据
3. 目前需要手动导入（未来将提供自动迁移工具）

## 切换回本地模式

如需切换回本地模式：

1. 删除 `.env.local` 文件
2. 重启开发服务器
3. 应用将自动使用IndexedDB本地存储

## 注意事项

- **数据隔离**：云端模式下，每个用户只能访问自己的数据
- **数据同步**：云端模式下，数据会自动同步到Supabase，支持多设备访问
- **数据备份**：建议定期使用导出功能备份数据
- **免费额度**：Supabase免费额度足够个人使用，详见[Supabase定价](https://supabase.com/pricing)

## 故障排除

### 登录失败
- 检查环境变量是否正确配置
- 确认数据库表已创建
- 检查Supabase项目是否正常运行

### 数据未同步
- 检查网络连接
- 确认Supabase项目配额未超限
- 查看浏览器控制台是否有错误信息

### 切换模式后数据丢失
- 本地模式和云端模式使用不同的存储
- 切换前请使用导出功能备份数据
