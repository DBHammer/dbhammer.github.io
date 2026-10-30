---
title: 成员
nav:
  order: 5
  tooltip: About our team
---

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-users"></i> Team</span>
  <h1 class="lab-title">成员</h1>
  <p class="lab-desc">
    DBHammer 实验室由张蓉教授领衔，现有在读博士生与硕士生十余名，
    并与国内外高校、企业保持紧密合作。
  </p>
</div>

{% assign professors = site.members | where: "role", "professor" %}
{% assign phds = site.members | where: "role", "phd" %}
{% assign posts = site.members | where: "role", "post" %}
{% assign grad_phds = site.members | where: "role", "graduated_phd" %}
{% assign grad_posts = site.members | where: "role", "graduated_post" %}

<div class="role-heading">
  <h2>教师</h2>
  <span class="role-count">{{ professors.size }}</span>
</div>
<div class="member-grid">
  {% include list.html data="members" component="portrait" filter="role == 'professor'" %}
</div>

<div class="role-heading">
  <h2>博士研究生</h2>
  <span class="role-count">{{ phds.size }}</span>
</div>
<div class="member-grid">
  {% include list.html data="members" component="portrait" filter="role == 'phd'" %}
</div>

<div class="role-heading">
  <h2>硕士研究生</h2>
  <span class="role-count">{{ posts.size }}</span>
</div>
<div class="member-grid">
  {% include list.html data="members" component="portrait" filter="role == 'post'" %}
</div>

<div class="role-heading">
  <h2>毕业博士生</h2>
  <span class="role-count">{{ grad_phds.size }}</span>
</div>
<div class="member-grid">
  {% include list.html data="members" component="portrait" filter="role == 'graduated_phd'" %}
</div>

<div class="role-heading">
  <h2>毕业硕士生</h2>
  <span class="role-count">{{ grad_posts.size }}</span>
</div>
<div class="member-grid">
  {% include list.html data="members" component="portrait" filter="role == 'graduated_post'" %}
</div>
