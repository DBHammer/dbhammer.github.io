---
title: 新闻
layout: default
nav:
  order: 4
  tooltip: News
---

<h1><i class="fas fa-newspaper"></i> 新闻</h1>

<div class="news-list text-left">
  {%- assign data = site.data.news | default: [] -%}
  {%- assign sorted_news = data | sort: "date" | reverse -%}
  {%- if sorted_news.size > 0 -%}
    <ul>
      {%- for item in sorted_news -%}
      <li class="mb-6">
        <div class="grid grid-cols-12 gap-4">
          <!-- 新闻类型 -->
          <div class="col-span-12 md:col-span-1 text-sky-500 font-bold">
            {{ item.type }}
          </div>
          <!-- 新闻日期 -->
          <div class="col-span-12 md:col-span-11 text-gray-700 font-thin">
            {{ item.date | date: "%Y年%-m月%-d日" }}
          </div>
          <!-- 新闻内容 -->
          <div class="col-span-12 md:col-span-11 md:col-start-2 text-black">
            {{ item.content }} <a href="{{ item.link }}" style="color:red; text-decoration:underline;"> PDF </a>
          </div>
        </div>
      </li>
      {%- endfor -%}
    </ul>
  {%- else -%}
    <p>暂无新闻内容。</p>
  {%- endif -%}
</div>
