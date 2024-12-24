---
title: 成员
nav:
  order: 5
  tooltip: About our team
---

# <i class="fas fa-users"></i>成员

{% include section.html %}

## 教师

{% include list.html data="members" component="portrait" filter="role == 'professor'" %}


## 博士研究生

{% include list.html data="members" component="portrait" filter="role == 'phd'" %}

## 硕士研究生

{% include list.html data="members" component="portrait" filter="role == 'post'" %}

## 毕业博士生

{% include list.html data="members" component="portrait" filter="role == 'graduated_phd'" %}

## 毕业硕士生

{% include list.html data="members" component="portrait" filter="role == 'graduated_post'" %}

{% include section.html %}

## Join

欢迎各位对数据库技术感兴趣的同学加入我们！
{:.center}

{% include link.html type="email" link="rzhang@dase.ecnu.edu.cn" text="联系我们" icon="" style="button" %}
{:.center}
