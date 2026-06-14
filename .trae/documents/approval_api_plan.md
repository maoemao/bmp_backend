# 审批单统一查询接口 - 实现规划

## 1. 需求分析

### 1.1 接口需求

用户需要新增2个接口：

| 接口 | 功能描述 |
| :--- | :--- |
| 审批列表接口 | 查看所有与当前用户相关的审批单，支持筛选（状态、审批类型、日期、用户） |
| 审批详情接口 | 根据审批单ID查看详情，包含审批节点、当前节点、节点审批人、可操作列表、历史记录 |

### 1.2 筛选条件

| 筛选字段 | 说明 |
| :--- | :--- |
| status | 状态筛选：已完成、进行中、已拒绝、已取消 |
| type | 审批类型：LEAVE、EXPENSE、PURCHASE |
| startDate | 开始日期 |
| endDate | 结束日期 |
| userId | 用户ID（申请人） |

### 1.3 详情返回内容

| 字段 | 说明 |
| :--- | :--- |
| application | 审批单基本信息 |
| approvalNodes | 所有审批节点列表 |
| currentNode | 当前审批节点 |
| currentApprovers | 当前节点审批人列表 |
| availableActions | 当前用户可操作列表 |
| historyRecords | 历史操作记录 |

---

## 2. 技术实现方案

### 2.1 新增模块结构

```
src/
└── approval/
    ├── approval.module.ts      # 已存在，需更新
    ├── approval.controller.ts  # 新增
    ├── approval.service.ts     # 新增
    └── dto/
        ├── query-approval.dto.ts    # 新增：查询参数DTO
        └── approval-detail.dto.ts   # 新增：详情响应DTO
```

### 2.2 API 接口设计

#### 接口1：审批列表

```
GET /approval/list?type=LEAVE&status=COMPLETED&startDate=2024-01-01&endDate=2024-12-31&userId=xxx
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| type | string | 否 | 审批类型：LEAVE/EXPENSE/PURCHASE |
| status | string | 否 | 状态：COMPLETED/PENDING/REJECTED/CANCELLED |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |
| userId | string | 否 | 申请人ID |

**响应结构：**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "LEAVE",
      "status": "COMPLETED",
      "applicant": {
        "id": "uuid",
        "name": "张三",
        "email": "xxx@qq.com",
        "department": "IT部门"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-02T00:00:00Z",
      "currentNode": "HR审批",
      "summary": "请假3天"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 10
}
```

#### 接口2：审批详情

```
GET /approval/:type/:id
```

**路径参数：**

| 参数 | 说明 |
| :--- | :--- |
| type | 审批类型：LEAVE/EXPENSE/PURCHASE |
| id | 审批单ID |

**响应结构：**

```json
{
  "application": {
    "id": "uuid",
    "type": "LEAVE",
    "status": "PENDING",
    "applicant": {...},
    "content": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-03",
      "reason": "个人原因"
    },
    "createdAt": "...",
    "updatedAt": "..."
  },
  "approvalNodes": [
    {
      "nodeName": "部门主管审批",
      "nodeRole": "MANAGER",
      "status": "APPROVED",
      "approver": {...},
      "comment": "同意",
      "approvedAt": "..."
    },
    {
      "nodeName": "HR审批",
      "nodeRole": "HR",
      "status": "PENDING",
      "approver": null,
      "comment": null,
      "approvedAt": null
    }
  ],
  "currentNode": {
    "nodeName": "HR审批",
    "nodeRole": "HR",
    "approvers": [...]
  },
  "availableActions": ["APPROVE", "REJECT", "COMMENT"],
  "historyRecords": [
    {
      "action": "CREATE",
      "operator": {...},
      "comment": null,
      "operatedAt": "..."
    },
    {
      "action": "APPROVE",
      "operator": {...},
      "comment": "同意",
      "operatedAt": "..."
    }
  ]
}
```

---

## 3. 实现步骤

| 步骤 | 任务 | 描述 |
| :--- | :--- | :--- |
| 1 | 创建查询DTO | 创建 query-approval.dto.ts |
| 2 | 创建详情响应DTO | 创建 approval-detail.dto.ts |
| 3 | 创建审批服务 | 创建 approval.service.ts |
| 4 | 创建审批控制器 | 创建 approval.controller.ts |
| 5 | 更新审批模块 | 更新 approval.module.ts |
| 6 | 构建测试 | 运行构建验证 |

---

## 4. 权限控制

| 角色 | 可见范围 |
| :--- | :--- |
| ADMIN/IT | 所有审批单 |
| MANAGER | 本部门审批单 + 自己作为审批人的审批单 |
| HR/FINANCE/DIRECTOR/CEO/PURCHASING | 所有相关审批单 + 自己作为审批人的审批单 |
| EMPLOYEE | 自己提交的审批单 + 自己作为审批人的审批单 |

---

**版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 待审批