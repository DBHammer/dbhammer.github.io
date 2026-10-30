---
title: 论文
nav:
  order: 3
  tooltip: Published works
---

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-microscope"></i> Publications</span>
  <h1 class="lab-title">论文</h1>
  <p class="lab-desc">
    实验室成果发表在 SIGMOD、VLDB、ICDE、CIDR、ATC、TKDE、TPDS 等会议和杂志上。
    支持关键词检索（如 <code>VLDB</code>、<code>isolation</code>）与下方分类筛选。
  </p>
</div>

<div class="lab-filters">
  <button class="filter-chip" type="button" data-filter="all" data-active>全部</button>
  <button class="filter-chip" type="button" data-filter="2026">2026</button>
  <button class="filter-chip" type="button" data-filter="2025">2025</button>
  <button class="filter-chip" type="button" data-filter="2024">2024</button>
  <button class="filter-chip" type="button" data-filter="sigmod">SIGMOD</button>
  <button class="filter-chip" type="button" data-filter="vldb">VLDB / PVLDB</button>
  <button class="filter-chip" type="button" data-filter="icde">ICDE</button>
  <button class="filter-chip" type="button" data-filter="cidr">CIDR</button>
  <button class="filter-chip" type="button" data-filter="dasfaa">DASFAA</button>
  <button class="filter-chip" type="button" data-filter="ndbc">NDBC</button>
  <button class="filter-chip" type="button" data-filter="journal">期刊</button>
</div>

{% include search-box.html %}

{% include search-info.html %}

<div class="lab-count"></div>

<div class="paper-list">
  {% include list.html data="citations" component="citation" style="rich" %}
</div>
