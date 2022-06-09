---
title: 成员
nav:
  order: 5
  tooltip: About our team
---

# <i class="fas fa-users"></i>成员

{% include section.html %}

## 教师

{%
  include member-list.html
  data="members"
  component="portrait"
  style="small"
  filters="role: professor"
%}

## 博士研究生

{%
  include member-list.html
  data="members"
  component="portrait"
  style="small"
  filters="role: phd"
%}

## 硕士研究生

{%
  include member-list.html
  data="members"
  component="portrait"
  style="small"
  filters="role: post"
%}

## 毕业生

{%
  include member-list.html
  data="members"
  component="portrait"
  style="small"
  filters="role: graduated"
%}

{% include section.html %}

## Join

欢迎各位对数据库技术感兴趣的同学加入我们！
{:.center}

{% include link.html type="email" link="rzhang@dase.ecnu.edu.cn" text="联系我们" icon="" style="button" %}
{:.center}

<!-- {% include section.html %} -->

<!-- ## Funding

Our work is made possible by funding from several organizations.
{:.center}

{%
  include gallery.html
  style="square"

  image1="images/photo.jpg"
  link1="https://nasa.gov/"
  tooltip1="Cool Foundation"

  image2="images/photo.jpg"
  link2="https://nasa.gov/"
  tooltip2="Cool Institute"

  image3="images/photo.jpg"
  link3="https://nasa.gov/"
  tooltip3="Cool Initiative"

  image4="images/photo.jpg"
  link4="https://nasa.gov/"
  tooltip4="Cool Foundation"

  image5="images/photo.jpg"
  link5="https://nasa.gov/"
  tooltip5="Cool Institute"

  image6="images/photo.jpg"
  link6="https://nasa.gov/"
  tooltip6="Cool Initiative"
%} -->
