---
title: 新闻
nav:
  order: 4
  tooltip: Published works
---

# <i class="fas fa-newspaper"></i>新闻

<div class="news-list text-left">

{%- assign data = site.news -%}
{%- if data -%}
  {%- assign sorted_data = data | sort: "date" | reverse -%}
  <ul>
    {%- for item in sorted_data -%}
      <li>
        <div class="grid grid-cols-12 gap-4 mb-4">
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
            {{ item.content }}
          </div>
        </div>
      </li>
    {%- endfor -%}
  </ul>
{%- else -%}
  <p>暂无新闻内容。</p>
{%- endif -%}

</div>