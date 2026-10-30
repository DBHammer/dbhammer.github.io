---
title: 博客
nav:
  order: 2
  tooltip: Musings and miscellany
---

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-feather-alt"></i> Blog</span>
  <h1 class="lab-title">博客</h1>
  <p class="lab-desc">
    实验室同学在数据库内核、评测基准与性能调优等方向上的技术分享与阅读笔记。
  </p>
</div>

{% include search-box.html %}

{% include tags.html tags=site.tags %}

{% include search-info.html %}

<div class="blog-list">
  {% include list.html data="posts" component="post-excerpt" %}
</div>
