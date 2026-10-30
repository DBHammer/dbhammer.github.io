---
title: 就业去向
layout: default
nav:
  order: 6
  tooltip: Where our graduates go
---

<div class="lab-heading">
  <span class="lab-kicker"><i class="fas fa-graduation-cap"></i> Alumni</span>
  <h1 class="lab-title">就业去向</h1>
  <p class="lab-desc">历届毕业生的深造与就业单位。</p>
</div>

{%- assign masters = site.data.employment.masters | sort: "year" | reverse -%}
{%- assign phds = site.data.employment.phd | sort: "year" | reverse -%}

<div class="dest-cols">
  <div>
    <div class="role-heading">
      <h3>硕士</h3>
      <span class="role-count">{{ masters.size }}</span>
    </div>
    {% for batch in masters %}
    <div class="dest-year">
      <span class="dest-year-badge">{{ batch.year }} 届</span>
      <div>
        {% for person in batch.people %}
        <div class="dest-item">
          <span class="dest-name">{{ person.name }}</span>
          <span class="dest-arrow"><i class="fas fa-arrow-right-long"></i></span>
          <span class="dest-dest">{{ person.dest }}</span>
          {% if person.note %}<span class="dest-note">{{ person.note }}</span>{% endif %}
        </div>
        {% endfor %}
      </div>
    </div>
    {% endfor %}
  </div>

  <div>
    <div class="role-heading">
      <h3>博士</h3>
      <span class="role-count">{{ phds.size }}</span>
    </div>
    {% for batch in phds %}
    <div class="dest-year">
      <span class="dest-year-badge">{{ batch.year }} 届</span>
      <div>
        {% for person in batch.people %}
        <div class="dest-item">
          <span class="dest-name">{{ person.name }}</span>
          <span class="dest-arrow"><i class="fas fa-arrow-right-long"></i></span>
          <span class="dest-dest">{{ person.dest }}</span>
          {% if person.note %}<span class="dest-note">{{ person.note }}</span>{% endif %}
        </div>
        {% endfor %}
      </div>
    </div>
    {% endfor %}
  </div>
</div>

<p style="text-align: center; margin-top: 40px;">
  <a class="btn-lab" href="{{ '/contact/' | relative_url }}">
    联系我们 <i class="fas fa-arrow-right"></i>
  </a>
</p>
