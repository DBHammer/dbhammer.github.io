---
title: DBHammer
---

{% assign member_count = site.members | size %}
{% assign paper_count = site.data.citations | size %}
{% assign top_count = 0 %}
{% for item in site.data.citations %}
  {% assign venue = item.publisher | downcase %}
  {% if venue contains "sigmod" or venue contains "vldb" or venue contains "icde" %}
    {% assign top_count = top_count | plus: 1 %}
  {% endif %}
{% endfor %}
{% assign tool_count = site.data.projects | size %}

{% include section.html size="full" dark="true" %}

<div class="hero">
  <canvas class="hero-canvas" id="heroCanvas"></canvas>
  <div class="hero-grid"></div>
  <span class="hero-blob" data-b="1"></span>
  <span class="hero-blob" data-b="2"></span>
  <span class="hero-blob" data-b="3"></span>

  <div class="hero-inner">
    <span class="hero-kicker">
      <i class="fas fa-database"></i> ECNU · DaSE · Database Systems Group
    </span>
    <h1 class="hero-title">DBHammer</h1>
    <p class="hero-sub">为数据库系统提供可信的评测基准、负载仿真与智能优化技术</p>
    <p class="hero-desc">
      DBHammer 实验室（导师：张蓉 教授）隶属于华东师范大学数据科学与工程学院。实验室致力于研发推动数据库发展的创新型技术，涵盖数据库系统内核、数据库系统质量保证（大规模负载仿真、评测基准、隔离级别验证、性能缺陷检测）以及 AI4DB 等方向，成果发表于 SIGMOD、VLDB、ICDE、CIDR、ATC、TKDE、TPDS 等国际顶级会议与期刊。
    </p>
    <div class="hero-actions">
      <a class="btn-lab" href="{{ '/research/' | relative_url }}">
        浏览论文 <i class="fas fa-arrow-right"></i>
      </a>
      <a class="btn-lab btn-lab-ghost" href="{{ '/team/' | relative_url }}">
        <i class="fas fa-users"></i> 认识团队
      </a>
    </div>
  </div>
</div>

<div class="hero-foot">
  <div class="stat-band">
    <div class="stat-card">
      <span class="stat-num" data-count="{{ member_count }}">0</span>
      <span class="stat-label">Members</span>
    </div>
    <div class="stat-card">
      <span class="stat-num" data-count="{{ paper_count }}">0</span>
      <span class="stat-label">Publications</span>
    </div>
    <div class="stat-card">
      <span class="stat-num" data-count="{{ top_count }}">0</span>
      <span class="stat-label">SIGMOD / VLDB / ICDE</span>
    </div>
    <div class="stat-card">
      <span class="stat-num" data-count="{{ tool_count }}">0</span>
      <span class="stat-label">Open Tools</span>
    </div>
  </div>
</div>

{% include section.html %}

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-bullseye"></i> Research</span>
  <h2 class="lab-title">研究方向</h2>
  <p class="lab-desc">
    从数据库内核到系统质量保证，再到面向 AI 的数据管理，DBHammer 围绕真实产业问题构建全栈技术能力。
  </p>
</div>

<div class="lab-cards">
  <a class="lab-card" href="{{ '/project/' | relative_url }}">
    <span class="lab-card-icon"><i class="fas fa-cogs"></i></span>
    <h3>数据库系统内核</h3>
    <p>高冲突事务处理框架、自适应数据分区与复制、HTAP 存储布局与数据共享模型，面向真实负载持续优化系统内核。</p>
    <span class="lab-card-more">查看项目 <i class="fas fa-arrow-right"></i></span>
  </a>
  <a class="lab-card" href="{{ '/project/' | relative_url }}">
    <span class="lab-card-icon"><i class="fas fa-shield-halved"></i></span>
    <h3>系统质量保证</h3>
    <p>面向应用的大规模负载仿真、数据库评测基准、事务隔离级别验证、分析型数据库性能缺陷检测与定位。</p>
    <span class="lab-card-more">查看工具 <i class="fas fa-arrow-right"></i></span>
  </a>
  <a class="lab-card" href="{{ '/research/' | relative_url }}">
    <span class="lab-card-icon"><i class="fas fa-brain"></i></span>
    <h3>AI4DB 与智能优化</h3>
    <p>基数估计、索引与旋钮推荐、查询计划修正、面向大模型的数据库分析与离线查询优化。</p>
    <span class="lab-card-more">浏览论文 <i class="fas fa-arrow-right"></i></span>
  </a>
</div>

{% include section.html %}

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-newspaper"></i> News</span>
  <h2 class="lab-title">最新动态</h2>
  <p class="lab-desc">实验室的获奖、参会与成果发布记录。</p>
</div>

<ul class="news-timeline">
  {% assign news_items = site.data.news | sort: "date" | reverse %}
  {% for item in news_items limit: 5 %}
  <li class="news-item" data-type="{{ item.type }}">
    <div class="news-date">
      <span class="news-day">{{ item.date | date: "%d" }}</span>
      <span class="news-month">{{ item.date | date: "%b %Y" }}</span>
    </div>
    <div class="news-body">
      <span class="news-type">{{ item.type }}</span>
      <div class="news-content">{{ item.content }}</div>
    </div>
  </li>
  {% endfor %}
</ul>

<p style="text-align: center; margin-top: 26px;">
  <a class="btn-lab" href="{{ '/news/' | relative_url }}">
    全部新闻 <i class="fas fa-arrow-right"></i>
  </a>
</p>

{% include section.html %}

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-scroll"></i> Publications</span>
  <h2 class="lab-title">近期论文</h2>
</div>

<div class="paper-list">
  {% assign recent = site.data.citations | sort: "date" | reverse %}
  {% for c in recent limit: 4 %}
    {%
      include citation.html
      title=c.title
      authors=c.authors
      publisher=c.publisher
      date=c.date
      link=c.link
      image=c.image
      description=c.description
      style="rich"
    %}
  {% endfor %}
</div>

<p style="text-align: center; margin-top: 26px;">
  <a class="btn-lab" href="{{ '/research/' | relative_url }}">
    全部论文 <i class="fas fa-arrow-right"></i>
  </a>
</p>

{% include section.html %}

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-handshake"></i> Collaborations</span>
  <h2 class="lab-title">合作企业</h2>
  <p class="lab-desc">实验室与国内外领先的数据库厂商和金融机构保持深入合作。</p>
</div>

<div class="marquee">
  <div class="marquee-track">
    {% assign partners = "华为,PolarDB,交通银行,恒生电子,OceanBase,TiDB,TDSQL,腾讯,蚂蚁集团" | split: "," %}
    {% for partner in partners %}
    <span class="marquee-item"><i class="fas fa-building-columns"></i> {{ partner }}</span>
    {% endfor %}
    {% for partner in partners %}
    <span class="marquee-item"><i class="fas fa-building-columns"></i> {{ partner }}</span>
    {% endfor %}
  </div>
</div>
