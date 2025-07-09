---
title: 就业去向
layout: default
nav:
  order: 5
  tooltip: Email, address, and location
---

<!-- ───── Employment 区块 ───────────────────────── -->
<h2 class="mt-10 text-xl font-semibold">毕业去向</h2>

{%- assign masters = site.data.employment.masters | sort: "year" | reverse -%}
{%- assign phds    = site.data.employment.phd                    -%}

{% if masters.size == 0 and phds.size == 0 %}
<p class="text-gray-500">暂无数据。</p>
{% else %}

<!-- ───── 硕士 ───── -->
{% if masters.size > 0 %}
<ul class="space-y-8">
  {% for batch in masters %}
  <li>
    <h3 class="font-bold text-sky-600 mb-2">{{ batch.year }} 届</h3>
    <ul class="list-disc pl-6 space-y-1">
      {% for p in batch.people %}
      <li>{{ p.name }}：{{ p.dest }}</li>
      {% endfor %}
    </ul>
  </li>
  {% endfor %}
</ul>
{% endif %}

<!-- ───── 博士 ───── -->
{% if phds.size > 0 %}
<h3 class="mt-10 font-bold text-sky-600 mb-2">博士</h3>
<ul class="list-disc pl-6 space-y-1">
  {% for p in phds %}
  <li>
    {{ p.name }}：{{ p.dest }}
    {% if p.note %}（{{ p.note }}）{% endif %}
  </li>
  {% endfor %}
</ul>
{% endif %}

{% endif %}

<!-- ───── Contact 区块 ───────────────────────────── -->
<h2 class="text-2xl font-semibold flex items-center mt-12 mb-6">
  {% include icon.html icon="fa-regular fa-envelope" class="mr-2" %} 联系我们
</h2>

<p class="text-center mb-4">
  欢迎各位对数据库技术感兴趣的同学加入我们 DBHammer 实验室！
</p>

{%
  include button.html
  type="email"
  text="rzhang@dase.ecnu.edu.cn"
  link="rzhang@dase.ecnu.edu.cn"
%}
{%
  include button.html
  type="address"
  tooltip="Our location on Google Maps for easy navigation"
  link="https://www.google.com/maps/place/%E5%8D%8E%E4%B8%9C%E5%B8%88%E8%8C%83%E5%A4%A7%E5%AD%A6/@31.227667,121.406829,17z"
%}

{% include section.html %}