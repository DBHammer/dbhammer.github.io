---
title: 项目
nav:
  order: 1
  tooltip: Software, datasets, and more
---

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-tools"></i> Projects</span>
  <h1 class="lab-title">项目与工具</h1>
  <p class="lab-desc">
    DBHammer 实验室研发了多款支持数据库系统评测与优化的工具，覆盖功能评测、性能仿真、基准测试与一体化测试平台。
  </p>
</div>

{%- assign w_metis = nil -%}
{%- assign w_pisco = nil -%}
{%- assign w_vodka = nil -%}
{%- assign w_obelisk = nil -%}
{%- for c in site.data.citations -%}
  {%- assign t = c.title | downcase -%}
  {%- if w_metis == nil and t contains "metis" -%}{%- assign w_metis = c -%}{%- endif -%}
  {%- if w_pisco == nil and t contains "pisco" -%}{%- assign w_pisco = c -%}{%- endif -%}
  {%- if w_vodka == nil and t contains "vodka" -%}{%- assign w_vodka = c -%}{%- endif -%}
  {%- if w_obelisk == nil and t contains "obelisk" -%}{%- assign w_obelisk = c -%}{%- endif -%}
{%- endfor -%}

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-fire"></i> Latest Work</span>
  <h2 class="lab-title">最新工作</h2>
  <p class="lab-desc">实验室近两年在评测、隔离级别验证、查询优化方向上的代表性成果。</p>
</div>

<div class="showcase">
  <article class="showcase-card">
    <div class="showcase-logo">V</div>
    <div class="showcase-body">
      <span class="showcase-venue">PVLDB {{ w_vodka.date | date: "%Y" }}</span>
      <h3 class="showcase-title">Vodka</h3>
      <span class="showcase-full">Rethink Benchmarking Philosophy in HTAP Systems</span>
      <p class="showcase-desc">
        现有 HTAP 基准往往把事务处理与分析查询割裂评测，难以反映混合负载下真实的资源争用与数据新鲜度。Vodka 从评测哲学层面重新审视 HTAP benchmark 的设计要素，提出面向混合负载的评测方法，刻画 TP 与 AP 相互干扰时系统的真实表现。
      </p>
      <div class="showcase-tags">
        <span class="showcase-chip">HTAP</span>
        <span class="showcase-chip">Benchmarking</span>
      </div>
      <div class="showcase-links">
        {%- if w_vodka.link -%}
        <a class="showcase-link" href="{{ w_vodka.link }}" target="_blank" rel="noopener">
          <i class="fas fa-file-pdf"></i> Paper
        </a>
        {%- endif -%}
        <a class="showcase-link" href="{{ '/research/' | relative_url }}">
          <i class="fas fa-quote-right"></i> Citation
        </a>
      </div>
    </div>
  </article>

  <article class="showcase-card">
    <div class="showcase-logo">P</div>
    <div class="showcase-body">
      <span class="showcase-venue">PVLDB {{ w_pisco.date | date: "%Y" }}</span>
      <h3 class="showcase-title">Pisco</h3>
      <span class="showcase-full">An Isolation Bug Case Reduction and Deduplication Framework</span>
      <p class="showcase-desc">
        真实系统的隔离级别实现可能偏离理论定义，从而产生隔离缺陷；而触发缺陷往往需要庞大的并发用例，难以定位与回归。Pisco 对触发用例进行自动化精简与去重，将庞杂的并发执行序列压缩为最小可复现用例并聚类，大幅降低缺陷定位与回归测试的成本。
      </p>
      <div class="showcase-tags">
        <span class="showcase-chip">Isolation Level</span>
        <span class="showcase-chip">Bug Reduction</span>
        <span class="showcase-chip">Testing</span>
      </div>
      <div class="showcase-links">
        {%- if w_pisco.link -%}
        <a class="showcase-link" href="{{ w_pisco.link }}" target="_blank" rel="noopener">
          <i class="fas fa-file-pdf"></i> Paper
        </a>
        {%- endif -%}
        <a class="showcase-link" href="{{ '/research/' | relative_url }}">
          <i class="fas fa-quote-right"></i> Citation
        </a>
      </div>
    </div>
  </article>

  <article class="showcase-card">
    <div class="showcase-logo">M</div>
    <div class="showcase-body">
      <span class="showcase-venue">PVLDB {{ w_metis.date | date: "%Y" }} · OceanBase</span>
      <h3 class="showcase-title">Metis</h3>
      <span class="showcase-full">Workload-Aware Multi-Dimensional Histograms for Cardinality Estimation</span>
      <p class="showcase-desc">
        基数估计是查询优化器选择执行计划的基础。传统一维直方图依赖属性独立假设，难以刻画多属性相关性；直接构建高维直方图又带来指数级空间开销。Metis 从历史查询反馈中识别真正影响估计准确性的属性组合，围绕“选对属性、建好统计、灵活使用”三个环节系统设计，在提升估计精度的同时控制统计信息的存储与维护成本。
      </p>
      <div class="showcase-tags">
        <span class="showcase-chip">Cardinality Estimation</span>
        <span class="showcase-chip">Query Optimizer</span>
        <span class="showcase-chip">OceanBase</span>
      </div>
      <div class="showcase-links">
        {%- if w_metis.link -%}
        <a class="showcase-link" href="{{ w_metis.link }}" target="_blank" rel="noopener">
          <i class="fas fa-file-pdf"></i> Paper
        </a>
        {%- endif -%}
        <a class="showcase-link" href="{{ '/research/' | relative_url }}">
          <i class="fas fa-quote-right"></i> Citation
        </a>
      </div>
    </div>
  </article>

  <article class="showcase-card">
    <div class="showcase-logo">O</div>
    <div class="showcase-body">
      <span class="showcase-venue">PVLDB {{ w_obelisk.date | date: "%Y" }} · TiDB</span>
      <h3 class="showcase-title">OBELISK</h3>
      <span class="showcase-full">Efficient Offline Query Planning with Bayesian Optimization-Informed Language Model Reasoning</span>
      <p class="showcase-desc">
        基于代价的优化器受基数估计与代价模型误差影响，容易产生计划回退。OBELISK 提出免训练的离线查询规划框架，以贝叶斯优化驱动搜索、用大模型的语义推理指导代价缩放旋钮的选取，在规避回退的同时提升优质计划的筛选效率与可解释性。
      </p>
      <div class="showcase-tags">
        <span class="showcase-chip">Query Planning</span>
        <span class="showcase-chip">LLM4DB</span>
        <span class="showcase-chip">TiDB</span>
      </div>
      <div class="showcase-links">
        {%- if w_obelisk.link -%}
        <a class="showcase-link" href="{{ w_obelisk.link }}" target="_blank" rel="noopener">
          <i class="fas fa-file-pdf"></i> Paper
        </a>
        {%- endif -%}
        <a class="showcase-link" href="{{ '/research/' | relative_url }}">
          <i class="fas fa-quote-right"></i> Citation
        </a>
      </div>
    </div>
  </article>
</div>

{% include section.html %}

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-compass"></i> Overview</span>
  <h2 class="lab-title">工具能力概览</h2>
</div>

<div class="intro-grid">
  <div class="lab-card">
    <span class="intro-index">01</span>
    <h3>数据库测试平台</h3>
    <p>提供有效的测试原语与高效的测试场景定义，集成 TPC-C、TPC-H、SmallBank 等主流 benchmark，支持一键评测并输出细粒度测试报告，同时支持软硬件故障注入与可用性测试。</p>
  </div>
  <div class="lab-card">
    <span class="intro-index">02</span>
    <h3>功能评测</h3>
    <p>自动化的大规模测试场景定义（数据 + 负载），保证负载生成的有效性与运行结果的可检测、可验证性，覆盖 OLTP 与 OLAP 数据库。</p>
  </div>
  <div class="lab-card">
    <span class="intro-index">03</span>
    <h3>性能评测</h3>
    <p>抽象业务场景中影响性能的关键数据与负载特征，设计可扩展的高效负载仿真工具，支撑面向应用的数据库性能评测与调优。</p>
  </div>
  <div class="lab-card">
    <span class="intro-index">04</span>
    <h3>新型 Benchmark</h3>
    <p>面向云原生与分布式数据库，定量控制数据与负载分布，解决传统 benchmark 难以量化评测分布式特征的问题。</p>
  </div>
</div>

{% assign func_projects = site.data.projects | where: "group", "function-evaluation" %}
{% assign sim_projects = site.data.projects | where: "group", "load-simulation" %}
{% assign bench_projects = site.data.projects | where: "group", "benchmark" %}
{% assign gen_projects = site.data.projects | where: "group", "general" %}

<div class="role-heading" style="justify-content: center;">
  <h2>面向数据库的功能评测</h2>
  <span class="role-count">{{ func_projects.size }}</span>
</div>
<div class="project-grid">
  {% include list.html component="card" data="projects" filter="group == 'function-evaluation'" %}
</div>

<div class="role-heading" style="justify-content: center;">
  <h2>面向应用的数据库性能评测</h2>
  <span class="role-count">{{ sim_projects.size }}</span>
</div>
<div class="project-grid">
  {% include list.html component="card" data="projects" filter="group == 'load-simulation'" %}
</div>

<div class="role-heading" style="justify-content: center;">
  <h2>面向新型数据库的 Benchmark</h2>
  <span class="role-count">{{ bench_projects.size }}</span>
</div>
<div class="project-grid">
  {% include list.html component="card" data="projects" filter="group == 'benchmark'" %}
</div>

<div class="role-heading" style="justify-content: center;">
  <h2>数据库测试平台</h2>
  <span class="role-count">{{ gen_projects.size }}</span>
</div>
<div class="project-grid">
  {% include list.html component="card" data="projects" filter="group == 'general'" %}
</div>
