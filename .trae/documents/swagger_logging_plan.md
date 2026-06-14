# Swagger集成与中间件功能 - 实现规划

## 1. 需求分析

### 1.1 Swagger集成

| 功能 | 说明 |
| :--- | :--- |
| API文档自动生成 | 根据Controller注解自动生成API文档 |
| 在线API测试 | 提供Swagger UI进行在线测试 |
| 接口描述 | 支持接口、参数、响应的详细描述 |

### 1.2 日志中间件

| 功能 | 说明 |
| :--- | :--- |
| 请求日志 | 记录请求方法、路径、参数 |
| 响应日志 | 记录响应状态、响应时间、响应结果 |
| 控制台输出 | 在控制台展示完整的请求响应日志 |
| 日志格式美化 | 使用彩色输出，易于阅读 |

### 1.3 Token校验中间件

| 功能 | 说明 |
| :--- | :--- |
| JWT验证 | 验证请求中的JWT token |
| Token过期处理 | 返回token过期错误 |
| 无效Token处理 | 返回无效token错误 |
| 白名单路径 | 登录、注册等路径不需要token |

---

## 2. 技术实现方案

### 2.1 Swagger集成

#### 依赖安装

```bash
npm install @nestjs/swagger swagger-ui-express
```

#### 配置方式

在 `main.ts` 中配置Swagger：

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('BMP Backend API')
  .setDescription('全业务审批系统API文档')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

### 2.2 中间件结构

```
src/
├── common/
│   └── middleware/
│       ├── logging.middleware.ts     # 日志中间件
│       └── auth.middleware.ts       # Token校验中间件
├── main.ts                          # Swagger配置 + 中间件注册
└── app.module.ts
```

### 2.3 日志中间件

#### 日志格式

```
┌─────────────────────────────────────────────────────────────┐
│ [2024-01-01 10:00:00] [GET] /leave (127.0.0.1)           │
├─────────────────────────────────────────────────────────────┤
│ Params: {}                                                 │
│ Query: {}                                                  │
│ Body: {"startDate":"2024-01-01","endDate":"2024-01-03"}   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ [2024-01-01 10:00:00] [200] /leave - 150ms               │
├─────────────────────────────────────────────────────────────┤
│ {"id":"xxx","status":"PENDING","..."}                      │
└─────────────────────────────────────────────────────────────┘
```

#### 实现要点

| 功能 | 实现方式 |
| :--- | :--- |
| 请求日志 | 在中间件中记录请求信息 |
| 响应日志 | 重写 `res.send` 或监听 `finish` 事件 |
| 响应时间 | 记录请求开始和结束时间，计算耗时 |
| 控制台输出 | 使用 `chalk` 库输出彩色日志 |

### 2.4 Token校验中间件

#### 白名单路径

| 路径 | 说明 |
| :--- | :--- |
| /auth/login | 用户登录 |
| /auth/register | 用户注册 |
| /api | Swagger文档 |
| /api-json | Swagger文档JSON |

#### 错误响应

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Token expired"
}
```

---

## 3. 实现步骤

| 步骤 | 任务 | 描述 |
| :--- | :--- | :--- |
| 1 | 安装依赖 | 安装 `@nestjs/swagger`, `swagger-ui-express`, `chalk` |
| 2 | 配置Swagger | 修改 `main.ts` 添加Swagger配置 |
| 3 | 创建日志中间件 | 创建 `logging.middleware.ts` |
| 4 | 创建Token校验中间件 | 创建 `auth.middleware.ts` |
| 5 | 注册中间件 | 修改 `main.ts` 注册中间件 |
| 6 | 构建测试 | 运行构建验证 |

---

## 4. Swagger访问地址

```
http://localhost:3000/api
```

---

**版本**: v2.0  
**创建日期**: 2026-06-14  
**状态**: 待审批