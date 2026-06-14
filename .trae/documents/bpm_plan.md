# 审批轨迹（BPM）功能 - 实现规划

## 1. 需求分析

### 1.1 功能概述

审批轨迹（BPM）功能用于可视化追踪审批流程的完整生命周期，包括：

| 功能 | 说明 |
| :--- | :--- |
| 流程定义管理 | 定义审批流程模板（节点、流转规则、条件分支） |
| 流程实例追踪 | 实时追踪每个审批单的流转状态和历史 |
| 流程图可视化 | 以图形化方式展示审批进度和当前位置 |
| 流程监控仪表盘 | 统计分析审批数据 |

### 1.2 核心概念

| 概念 | 说明 |
| :--- | :--- |
| ProcessDefinition | 流程定义（模板） |
| ProcessInstance | 流程实例（具体审批单） |
| ProcessNode | 流程节点 |
| Transition | 节点流转规则 |
| Condition | 条件分支（如金额判断） |

---

## 2. 技术实现方案

### 2.1 新增实体

#### 流程定义表 (process_definitions)

| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | 流程定义ID |
| name | VARCHAR(100) | NOT NULL | 流程名称 |
| type | VARCHAR(30) | NOT NULL | 流程类型（LEAVE/EXPENSE/PURCHASE） |
| description | VARCHAR(500) | | 流程描述 |
| config | JSON | NOT NULL | 流程配置（节点、流转规则） |
| isActive | BOOLEAN | DEFAULT true | 是否启用 |
| createdAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 流程实例表 (process_instances)

| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | 实例ID |
| processDefinitionId | UUID | FOREIGN KEY | 流程定义ID |
| applicationId | UUID | NOT NULL | 关联的审批单ID |
| applicationType | VARCHAR(30) | NOT NULL | 审批类型 |
| currentNodeId | VARCHAR(50) | | 当前节点ID |
| status | VARCHAR(30) | NOT NULL | 实例状态 |
| createdAt | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 流程节点历史表 (process_node_history)

| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | 记录ID |
| processInstanceId | UUID | FOREIGN KEY | 流程实例ID |
| nodeId | VARCHAR(50) | NOT NULL | 节点ID |
| nodeName | VARCHAR(100) | NOT NULL | 节点名称 |
| nodeRole | VARCHAR(30) | NOT NULL | 节点角色 |
| status | VARCHAR(30) | NOT NULL | 节点状态 |
| approverId | UUID | | 审批人ID |
| comment | TEXT | | 审批意见 |
| startedAt | TIMESTAMP | NOT NULL | 开始时间 |
| completedAt | TIMESTAMP | | 完成时间 |

### 2.2 流程配置结构

```json
{
  "startNode": "start",
  "nodes": [
    {
      "id": "dept_manager",
      "name": "部门主管审批",
      "role": "MANAGER",
      "type": "approval",
      "required": true
    },
    {
      "id": "purchase_review",
      "name": "采购部门复核",
      "role": "PURCHASING",
      "type": "approval",
      "required": true
    },
    {
      "id": "director_review",
      "name": "总监审批",
      "role": "DIRECTOR",
      "type": "approval",
      "required": true
    },
    {
      "id": "ceo_review",
      "name": "CEO审批",
      "role": "CEO",
      "type": "approval",
      "required": true
    },
    {
      "id": "finance_review",
      "name": "财务审核",
      "role": "FINANCE",
      "type": "approval",
      "required": true
    },
    {
      "id": "end",
      "name": "结束",
      "type": "end"
    }
  ],
  "transitions": [
    {
      "from": "start",
      "to": "dept_manager"
    },
    {
      "from": "dept_manager",
      "to": "purchase_review",
      "condition": null
    },
    {
      "from": "purchase_review",
      "to": "director_review",
      "condition": {
        "field": "amount",
        "operator": ">",
        "value": 5000
      }
    },
    {
      "from": "purchase_review",
      "to": "finance_review",
      "condition": {
        "field": "amount",
        "operator": "<=",
        "value": 5000
      }
    },
    {
      "from": "director_review",
      "to": "ceo_review",
      "condition": {
        "field": "amount",
        "operator": ">",
        "value": 50000
      }
    },
    {
      "from": "director_review",
      "to": "finance_review",
      "condition": {
        "field": "amount",
        "operator": "<=",
        "value": 50000
      }
    },
    {
      "from": "ceo_review",
      "to": "finance_review"
    },
    {
      "from": "finance_review",
      "to": "end"
    }
  ]
}
```

### 2.3 模块结构

```
src/
└── bpm/
    ├── bpm.module.ts
    ├── bpm.controller.ts
    ├── bpm.service.ts
    ├── entities/
    │   ├── process-definition.entity.ts
    │   ├── process-instance.entity.ts
    │   └── process-node-history.entity.ts
    └── dto/
        ├── create-process-definition.dto.ts
        └── query-instance.dto.ts
```

### 2.4 API 接口设计

| HTTP方法 | 路径 | 功能描述 |
| :--- | :--- | :--- |
| POST | /bpm/definitions | 创建流程定义 |
| GET | /bpm/definitions | 获取流程定义列表 |
| GET | /bpm/definitions/:id | 获取流程定义详情 |
| PUT | /bpm/definitions/:id | 更新流程定义 |
| DELETE | /bpm/definitions/:id | 删除流程定义 |
| GET | /bpm/instances | 获取流程实例列表 |
| GET | /bpm/instances/:id | 获取流程实例详情 |
| GET | /bpm/instances/:id/trace | 获取流程轨迹（含可视化数据） |
| GET | /bpm/dashboard | 获取流程监控仪表盘 |

---

## 3. 流程轨迹响应结构

### 3.1 获取流程轨迹

```
GET /bpm/instances/:id/trace
```

**响应结构：**

```json
{
  "instance": {
    "id": "uuid",
    "processDefinitionId": "uuid",
    "applicationId": "uuid",
    "applicationType": "PURCHASE",
    "currentNodeId": "director_review",
    "status": "IN_PROGRESS"
  },
  "flowChart": {
    "nodes": [
      {
        "id": "start",
        "name": "开始",
        "status": "completed",
        "order": 0
      },
      {
        "id": "dept_manager",
        "name": "部门主管审批",
        "role": "MANAGER",
        "status": "completed",
        "approver": {"id": "xxx", "name": "张三"},
        "comment": "同意",
        "completedAt": "2024-01-01T10:00:00Z",
        "order": 1
      },
      {
        "id": "purchase_review",
        "name": "采购部门复核",
        "role": "PURCHASING",
        "status": "completed",
        "approver": {"id": "xxx", "name": "李四"},
        "comment": "价格合理",
        "completedAt": "2024-01-01T11:00:00Z",
        "order": 2
      },
      {
        "id": "director_review",
        "name": "总监审批",
        "role": "DIRECTOR",
        "status": "current",
        "approvers": [{"id": "xxx", "name": "王五"}],
        "startedAt": "2024-01-01T12:00:00Z",
        "order": 3
      },
      {
        "id": "ceo_review",
        "name": "CEO审批",
        "role": "CEO",
        "status": "pending",
        "order": 4
      },
      {
        "id": "finance_review",
        "name": "财务审核",
        "role": "FINANCE",
        "status": "pending",
        "order": 5
      },
      {
        "id": "end",
        "name": "结束",
        "status": "pending",
        "order": 6
      }
    ],
    "edges": [
      {"from": "start", "to": "dept_manager"},
      {"from": "dept_manager", "to": "purchase_review"},
      {"from": "purchase_review", "to": "director_review", "condition": "amount > 5000"},
      {"from": "director_review", "to": "ceo_review", "condition": "amount > 50000"},
      {"from": "director_review", "to": "finance_review", "condition": "amount <= 50000"},
      {"from": "ceo_review", "to": "finance_review"},
      {"from": "finance_review", "to": "end"}
    ],
    "currentPath": ["start", "dept_manager", "purchase_review", "director_review"]
  },
  "history": [
    {
      "nodeId": "dept_manager",
      "nodeName": "部门主管审批",
      "action": "APPROVE",
      "operator": {"id": "xxx", "name": "张三"},
      "comment": "同意",
      "operatedAt": "2024-01-01T10:00:00Z"
    }
  ],
  "availableActions": ["APPROVE", "REJECT", "COMMENT"]
}
```

### 3.2 仪表盘响应

```json
{
  "totalApplications": 100,
  "pendingApplications": 25,
  "completedApplications": 65,
  "rejectedApplications": 10,
  "avgApprovalTime": "2.5小时",
  "applicationsByType": [
    {"type": "LEAVE", "count": 40},
    {"type": "EXPENSE", "count": 35},
    {"type": "PURCHASE", "count": 25}
  ],
  "applicationsByStatus": [
    {"status": "PENDING", "count": 25},
    {"status": "IN_PROGRESS", "count": 15},
    {"status": "COMPLETED", "count": 50},
    {"status": "REJECTED", "count": 10}
  ],
  "recentApplications": [...]
}
```

---

## 4. 实现步骤

| 步骤 | 任务 | 描述 |
| :--- | :--- | :--- |
| 1 | 创建实体 | 创建 ProcessDefinition, ProcessInstance, ProcessNodeHistory 实体 |
| 2 | 创建DTO | 创建相关DTO |
| 3 | 创建BPM服务 | 创建 bpm.service.ts |
| 4 | 创建BPM控制器 | 创建 bpm.controller.ts |
| 5 | 更新模块 | 创建 bpm.module.ts 并更新 app.module.ts |
| 6 | 初始化流程定义 | 为LEAVE/EXPENSE/PURCHASE创建默认流程定义 |
| 7 | 集成现有审批流程 | 修改 leave/expense/purchase service 使用BPM |
| 8 | 构建测试 | 运行构建验证 |

---

**版本**: v1.0  
**创建日期**: 2026-06-14  
**状态**: 待审批