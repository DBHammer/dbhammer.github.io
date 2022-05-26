---
title: 项目
nav:
  order: 1
  tooltip: Software, datasets, and more
---

# <i class="fas fa-tools"></i>项目

DBHammer实验室研发了多款支持数据库系统评测的工具，包括：  

- 数据库测试平台：该测试平台提供有效的测试原语，支持高效的测试场景定义；集成了主流的 benchmark 测试，如 TPC-C，TPC-H, SmallBank 等，支持一键评测，并输出总体测试报告以及细粒度测试报告；实现了常见软硬件故障注入，支持系统稳定性和可用性测试。  

- 面向 OLTP/OLAP 数据库的功能评测：完成自动化的大规模测试场景定义，包括：数据和负载，保证自动化生成负载的有效性以及运行过程或者结果的可检测性。对于 AP 数据库来说，数据的可迁移，负载生成的可扩展性与运行结果的自验证性，是工具可用性的保证；对于 TP 数据库来说，运行时大规模负载生成的有效性保证以及自动化运行结果的验证是工具可用性的保证。

-	面向 OLTP/OLAP 应用的数据库性能评测：面向应用的测试场景仿真是评估数据库对业务应用支持能力的重要手段，也是面向应用的数据库性能优化的重要支撑。通过抽象业务场景中影响性能的关键特征，包括数据特征与负载特征，设计可扩展的高效负载仿真工具。  

- 面向新型数据库的 Benchmark：现有的经典 benchmark 基本都是2010年之前定义的，近年来，随着硬件和平台的发展，基于云环境的分布式数据库技术越来越成熟。传统 benchmark 在业务抽象的时候，对负载分布、数据分布的考虑不多或者说无法定量控制负载或者数据的分布，导致现有负载对数据库的分布式特征的评测量化困难。


{% include search-info.html %}

{% include section.html %}

## 面向数据库的功能评测

{% include toollist.html component="toolcard" data="tools" filters="group: function-evaluation" %}

{% include section.html %}

## 面向应用的数据库性能评测

{% include toollist.html component="toolcard" data="tools" filters="group: load-simulation" %}

{% include section.html %}

## 面向新型数据库的Benchmark

{% include toollist.html component="toolcard" data="tools" filters="group: benchmark" %}

{% include section.html %}

## 数据库测试平台

{% include toollist.html component="toolcard" style="large" data="tools" filters="group: general" %}