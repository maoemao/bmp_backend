# BMP Backend - 全业务审批系统

基于 NestJS 构建的企业级审批系统后端服务。

## 技术栈

- **框架**: NestJS 10.x
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **ORM**: TypeORM
- **认证**: JWT
- **部署**: Docker

## 功能模块

### 1. 用户管理模块
- 用户注册/登录
- 角色管理（ADMIN, IT, MANAGER, HR, FINANCE, DIRECTOR, CEO, PURCHASING, EMPLOYEE）
- 部门管理
- 权限控制

### 2. 请假流程
- 员工提交请假申请
- 部门主管审批
- HR审批（可多人审批）
- 申请取消

### 3. 报销流程
- 员工提交报销申请
- 部门主管审批
- 总监审批（金额>1000元）
- 财务审批（可多人审批）

### 4. 采购申请流程
- 员工提交采购申请
- 部门主管初审
- 采购部门复核
- 总监审批（金额>5000元）
- CEO审批（金额>50000元）
- 财务审核
- 生成采购订单(PO)

### 5. 审批查询接口
- 审批列表查询（支持筛选）
- 审批详情查询（含节点、历史记录）

### 6. BPM审批轨迹
- 流程定义管理
- 流程实例追踪
- 流程图可视化
- 流程监控仪表盘

## 项目结构

```
src/
├── auth/                    # 认证模块
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   └── jwt.strategy.ts
├── users/                   # 用户管理模块
│   ├── users.controller.ts
│   ├── users.module.ts
│   ├── users.service.ts
│   └── user.entity.ts
├── leave/                   # 请假流程模块
│   ├── leave.controller.ts
│   ├── leave.module.ts
│   ├── leave.service.ts
│   └── leave.entity.ts
├── expense/                 # 报销流程模块
│   ├── expense.controller.ts
│   ├── expense.module.ts
│   ├── expense.service.ts
│   └── expense.entity.ts
├── purchase/                # 采购流程模块
│   ├── purchase.controller.ts
│   ├── purchase.module.ts
│   ├── purchase.service.ts
│   └── purchase.entity.ts
├── approval/                # 审批查询模块
│   ├── approval.controller.ts
│   ├── approval.module.ts
│   ├── approval.service.ts
│   └── approval.entity.ts
├── bpm/                     # BPM审批轨迹模块
│   ├── bpm.controller.ts
│   ├── bpm.module.ts
│   ├── bpm.service.ts
│   └── entities/
├── app.module.ts
└── main.ts
```

## 快速开始

### 环境要求

- Node.js >= 20.x
- Docker (推荐)

### 运行方式

#### 方式一：使用 Docker（推荐）

```bash
# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止容器
docker-compose down

# 停止并删除数据卷（慎用，会清除数据库数据）
docker-compose down -v

# 重启容器
docker-compose restart

# 更新并重启（拉取最新代码后使用）
docker-compose down && docker-compose up -d --build

# 进入容器内部
docker exec -it bmp_postgres psql -U bmp_user -d bmp_db
```

#### 方式二：本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run start:dev
```

### 默认账户

```
邮箱: admin@qq.com
密码: admin123
```

## API 接口

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/register | 用户注册 |
| POST | /auth/login | 用户登录 |

### 用户管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /users | 获取用户列表 |
| GET | /users/:id | 获取用户详情 |
| POST | /users | 创建用户 |
| PUT | /users/:id | 更新用户 |
| DELETE | /users/:id | 删除用户 |

### 请假流程接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /leave/apply | 提交请假申请 |
| GET | /leave | 获取请假列表 |
| GET | /leave/:id | 获取请假详情 |
| PUT | /leave/:id/approve | 审批请假 |
| PUT | /leave/:id/reject | 拒绝请假 |
| DELETE | /leave/:id | 取消请假 |

### 报销流程接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /expense/apply | 提交报销申请 |
| GET | /expense | 获取报销列表 |
| GET | /expense/:id | 获取报销详情 |
| PUT | /expense/:id/approve | 审批报销 |
| PUT | /expense/:id/reject | 拒绝报销 |
| DELETE | /expense/:id | 取消报销 |

### 采购流程接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /purchase/apply | 提交采购申请 |
| GET | /purchase | 获取采购列表 |
| GET | /purchase/:id | 获取采购详情 |
| PUT | /purchase/:id/approve | 审批采购 |
| PUT | /purchase/:id/reject | 拒绝采购 |
| DELETE | /purchase/:id | 取消采购 |

### 审批查询接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /approval/list | 获取审批列表 |
| GET | /approval/:type/:id | 获取审批详情 |

### 配置接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /config | 获取所有配置信息 |
| GET | /config/departments | 获取部门列表 |
| GET | /config/roles | 获取角色列表（带中文标签） |

### BPM接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /bpm/definitions | 获取流程定义列表 |
| GET | /bpm/instances | 获取流程实例列表 |
| GET | /bpm/instances/:id/trace | 获取流程轨迹 |
| GET | /bpm/dashboard | 获取监控仪表盘 |

## 配置说明

环境变量配置（.env）：

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=bmp_db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=3600s
```

## 开发命令

```bash
# 启动开发服务器
npm run start:dev

# 构建生产版本
npm run build

# 运行生产版本
npm run start:prod

# 运行测试
npm run test

# 运行e2e测试
npm run test:e2e
```

## License

MIT License