# 一心智考考试系统 - 后端服务

## 🚀 快速启动

### 方法一：双击启动（推荐）

直接双击 `启动服务器.bat` 文件即可自动启动服务器。

### 方法二：命令行启动

```bash
# 进入后端目录
cd exam-system-server

# 安装依赖（首次运行需要）
npm install

# 启动服务器
npm start
```

## 🌐 访问地址

- **后端服务器**: http://localhost:3001
- **前端页面**: 打开 `exam-system-complete.html` 文件

## 👤 测试账号

### 学生账号
- **用户名**: `student`
- **密码**: `student123`
- **角色**: 学生
- **年级**: 2024级

### 教师账号
- **用户名**: `teacher`
- **密码**: `teacher123`
- **角色**: 教师

### 通用测试账号（前端内置）
- **用户名**: `test`
- **密码**: `123456`

## 📊 示例数据

启动服务器时会自动创建以下示例数据：

### 考试（3场）
1. 程序设计基础期末考试（已发布）
2. 高等数学期末考试（已发布）
3. 大学英语期中考试（已发布）

### 题目（15道）
- 高等数学：5道题
- 大学英语：5道题
- 程序设计基础：5道题

### 任务（5个）
- 完成高等数学第三章练习题
- 背诵英语单词表Unit 5
- 完成程序设计实验报告
- 复习线性代数知识点
- 完成英语听力训练

### 消息（3条）
- 欢迎使用一心智考系统
- 考试通知
- 成绩发布

## 🔌 API 端点

后端提供52个RESTful API端点，包括：

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录

### 考试管理
- `GET /api/exams` - 获取考试列表
- `POST /api/exams` - 创建考试
- `GET /api/exams/:id` - 获取考试详情
- `POST /api/exams/:id/start` - 开始考试
- `POST /api/exams/:id/submit` - 提交考试

### 题库管理
- `GET /api/questions` - 获取题目列表
- `POST /api/questions` - 创建题目
- `GET /api/questions/subjects` - 获取科目列表

### 成绩与统计
- `GET /api/scores` - 获取成绩
- `GET /api/scores/statistics` - 成绩统计
- `GET /api/scores/rank` - 成绩排名

### 学生功能
- `GET /api/exam-records` - 考试记录
- `GET /api/wrong-questions` - 错题本
- `GET /api/practice/questions` - 练习题目
- `GET /api/tasks` - 任务列表
- `GET /api/messages` - 消息列表
- `GET /api/activities` - 个人动态

### AI 功能
- `POST /api/ai/chat` - AI对话
- `POST /api/ai/suggestions` - 学习建议

## 🗄️ 数据库

- **数据库类型**: SQLite
- **数据库文件**: `exam_system.db`
- **数据库位置**: 与 `server.js` 同目录

## 📝 技术栈

- **运行时**: Node.js
- **框架**: Express.js
- **数据库**: SQLite3
- **密码加密**: bcryptjs
- **跨域**: CORS

## 🔧 常见问题

### Q: 服务器启动失败？
A: 请确保已安装 Node.js，并运行 `npm install` 安装依赖。

### Q: 如何重置数据库？
A: 删除 `exam_system.db` 文件，然后重新启动服务器。

### Q: 前端无法连接后端？
A: 确保后端服务器正在运行，并检查前端文件 `exam-system-complete.html` 中的 `API_BASE` 配置为 `http://localhost:3001/api`。

## 📞 支持

如有问题，请检查控制台输出或查看服务器日志。
