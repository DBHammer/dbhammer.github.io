/*
  DBHammer 视觉增强：粒子背景、滚动揭示、数字滚动、论文筛选、回到顶部
*/
{
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 滚动揭示 ---------- */
  const setupReveal = () => {
    const selector = [
      ".stat-card",
      ".lab-card",
      ".news-item",
      ".member-grid .portrait",
      ".citation-container",
      ".project-grid .card",
      ".showcase-card",
      ".post-excerpt-container",
      ".contact-card",
      ".join-banner",
      ".dest-year",
      ".lab-heading",
      ".marquee",
    ].join(", ");
    const elements = Array.from(document.querySelectorAll(selector));

    if (reduced || !("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    elements.forEach((el) => el.setAttribute("data-reveal", ""));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.style.transitionDelay = `${Math.min(index * 60, 320)}ms`;
          el.classList.add("is-visible");
          observer.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    elements.forEach((el) => observer.observe(el));
  };

  /* ---------- 数字滚动 ---------- */
  const setupCounters = () => {
    const counters = Array.from(document.querySelectorAll("[data-count]"));
    if (!counters.length) return;

    const run = (el) => {
      const target = Number(el.dataset.count) || 0;
      if (reduced) {
        el.textContent = String(target);
        return;
      }
      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = String(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!("IntersectionObserver" in window)) {
      counters.forEach(run);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          run(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    counters.forEach((el) => observer.observe(el));
  };

  /* ---------- Hero 粒子网络 ---------- */
  const setupParticles = () => {
    const canvas = document.getElementById("heroCanvas");
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let points = [];
    let raf = null;
    const pointer = { x: -9999, y: -9999, active: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(72, Math.round((width * height) / 16000));
      points = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.6 + 0.7,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of points) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(165, 243, 252, 0.85)";
        ctx.fill();
      }

      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist > 128) continue;
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.strokeStyle = `rgba(148, 214, 255, ${0.24 * (1 - dist / 128)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      if (pointer.active) {
        for (const p of points) {
          const dist = Math.hypot(p.x - pointer.x, p.y - pointer.y);
          if (dist > 150) continue;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.strokeStyle = `rgba(232, 121, 249, ${0.4 * (1 - dist / 150)})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const hero = canvas.parentElement;
    hero.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    });
    hero.addEventListener("pointerleave", () => {
      pointer.active = false;
    });

    resize();
    draw();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = null;
      } else if (!raf) {
        draw();
      }
    });
  };

  /* ---------- 论文筛选 ---------- */
  const setupFilters = () => {
    const bar = document.querySelector(".lab-filters");
    if (!bar) return;

    const chips = Array.from(bar.querySelectorAll(".filter-chip"));
    const citations = Array.from(document.querySelectorAll(".citation-container"));
    const countEl = document.querySelector(".lab-count");
    if (!citations.length) return;

    const apply = (value) => {
      let visible = 0;

      citations.forEach((container) => {
        const citation = container.querySelector(".citation");
        if (!citation) return;
        const match = value === "all" || citation.dataset.group.split(" ").includes(value);
        container.classList.toggle("lab-hidden", !match);
        citation.classList.toggle("lab-hidden", !match);
        if (match) visible++;
      });

      // 隐藏没有可见论文的年份标题
      document.querySelectorAll(".paper-list h3").forEach((heading) => {
        let node = heading.nextElementSibling;
        let hasVisible = false;
        while (node && node.tagName !== "H3") {
          if (node.classList && node.classList.contains("citation-container") &&
              !node.classList.contains("lab-hidden")) {
            hasVisible = true;
            break;
          }
          node = node.nextElementSibling;
        }
        heading.hidden = !hasVisible;
      });

      if (countEl) {
        countEl.textContent =
          value === "all"
            ? `共 ${citations.length} 篇论文`
            : `筛选出 ${visible} / ${citations.length} 篇论文`;
      }
    };

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((other) => other.removeAttribute("data-active"));
        chip.setAttribute("data-active", "");
        apply(chip.dataset.filter);
      });
    });
  };

  /* ---------- 回到顶部 ---------- */
  const setupBackToTop = () => {
    const button = document.createElement("button");
    button.className = "lab-top";
    button.type = "button";
    button.setAttribute("aria-label", "back to top");
    button.innerHTML = '<i class="fas fa-arrow-up"></i>';
    button.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
    );
    document.body.appendChild(button);

    const update = () => {
      if (window.scrollY > 420) button.setAttribute("data-show", "");
      else button.removeAttribute("data-show");
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  };

  /* ---------- 图片兜底占位 ---------- */
  const setupImageFallback = () => {
    const placeholder = "/images/placeholder.svg";

    const swap = (img) => {
      if (!img || img.dataset.placeholderApplied) return;
      img.dataset.placeholderApplied = "1";
      img.src = placeholder;
    };

    // error 事件不冒泡, 必须用捕获阶段
    document.addEventListener(
      "error",
      (event) => {
        if (event.target && event.target.tagName === "IMG") swap(event.target);
      },
      true
    );

    // 处理在脚本执行前就已经加载失败的图片
    Array.from(document.images).forEach((img) => {
      if (img.complete && img.naturalWidth === 0) swap(img);
    });
  };

  /* ---------- 当前导航高亮 ---------- */
  const setupNav = () => {
    const here = window.location.pathname.replace(/index\.html$/, "");
    document.querySelectorAll("nav > a").forEach((link) => {
      const href = (link.getAttribute("href") || "").replace(/index\.html$/, "");
      if (href !== "/" && here.startsWith(href)) link.setAttribute("data-active", "");
    });
  };

  const init = () => {
    setupNav();
    setupImageFallback();
    setupReveal();
    setupCounters();
    setupParticles();
    setupFilters();
    setupBackToTop();
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
}
