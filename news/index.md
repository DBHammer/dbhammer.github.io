---
title: 新闻
nav:
  order: 4
  tooltip: News
---

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-newspaper"></i> News</span>
  <h1 class="lab-title">新闻速递</h1>
  <p class="lab-desc">记录 DBHammer 实验室的获奖、参会、成果发布与团队动态。</p>
</div>

{%- assign sorted_news = site.data.news | sort: "date" | reverse -%}

<ul class="news-timeline">
  {% for item in sorted_news %}
  <li class="news-item" data-type="{{ item.type }}">
    <div class="news-date">
      <span class="news-day">{{ item.date | date: "%d" }}</span>
      <span class="news-month">{{ item.date | date: "%b %Y" }}</span>
    </div>
    <div class="news-body">
      <span class="news-type">{{ item.type }}</span>
      <div class="news-content">
        {{ item.content }}
        {%- if item.link and item.link != '' and item.link != 'none' -%}
          <a href="{{ item.link }}" target="_blank" rel="noopener">
            <i class="fas fa-file-pdf"></i> 详情
          </a>
        {%- endif -%}
      </div>
    </div>
  </li>
  {% endfor %}
</ul>
