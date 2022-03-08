---
title: DBHammer
---

# DBHammer

实验室主要研究数据库系统实现核心技术，如高冲突事务处理框架、自适应数据分区等；数据库系统质量保证的关键技术，如面向应用的大规模负载仿真、Benchmark等。

<!-- {%
  include link.html
  type="github"
  icon=""
  text="See the template on GitHub"
  link="greenelab/lab-website-template"
  style="button"
%}
{%
  include link.html
  type="docs"
  icon=""
  text="See the documentation"
  link="https://github.com/greenelab/lab-website-template/wiki"
  style="button"
%} -->
{:.center}

{% include section.html %}

{%
  include figure.html
  image="images/description.jpg"
  link="team"
  width="400px"
%}

{% include section.html %}

<!-- # Highlights -->

{% capture text %}
DBHammer实验室在高水平期刊/会议上发表多篇论文。

{%
  include link.html
  link="research"
  text="See what we've published"
  icon="fas fa-arrow-right"
  flip=true
%}
{:.center}
{% endcapture %}

{%
  include feature.html
  image="images/research.jfif"
  link="research"
  title="Our Research"
  text=text
%}

{% capture text %}
DBHammer实验室开发了适合于AP测试、TP测试以及综合性测试的多款工具。

{%
  include link.html
  link="tools"
  text="Browse our tools"
  icon="fas fa-arrow-right"
  flip=true
%}
{:.center}
{% endcapture %}

{%
  include feature.html
  image="images/tools.png"
  link="resources"
  title="Our Tools"
  flip=true
  text=text
%}

{% capture text %}
DBHammer团队有AP、TP等多种研究方向。

{%
  include link.html
  link="team"
  text="Meet our team"
  icon="fas fa-arrow-right"
  flip=true
%}
{:.center}
{% endcapture %}

{%
  include feature.html
  image="images/team.jfif"
  link="team"
  title="Our Team"
  text=text
%}

欢迎各位对数据库技术感兴趣的同学加入我们！
