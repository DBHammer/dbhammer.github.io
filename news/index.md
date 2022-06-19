---
title: 新闻
nav:
  order: 4
  tooltip: Published works
---

# <i class="fas fa-newspaper"></i>新闻

<div class="news-list text-left">

{%- assign data = site.news -%}
{%- assign sorted_data = data | sort: "date" | reverse -%}

<ul>
{%- for item in sorted_data -%}

  <li>
    <div class="grid grid-cols-12">
    <div class="text-sky-500 font-bold">{{item.type}}</div>
    <div class="text-black font-thin col-span-12 md:col-span-11">{{item.date | date: "%Y年%-m月%-d日" }}</div>
    <div class="col-span-12 md:col-start-2">
    {{item.content}}
    </div>
    </div>
  </li>

{%- endfor -%}
</ul>


</div>