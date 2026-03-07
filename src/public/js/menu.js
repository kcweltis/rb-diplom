(function () {
    const links = Array.from(document.querySelectorAll(".catNav__link"))
        .filter(a => a.getAttribute("href") && a.getAttribute("href").startsWith("#cat-"));

    const sections = links
        .map(a => document.querySelector(a.getAttribute("href")))
        .filter(Boolean);

    if (!links.length || !sections.length) return;

    const setActive = (id) => {
        links.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === id));
    };

    const io = new IntersectionObserver((entries) => {
        const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible) setActive("#" + visible.target.id);
    }, { rootMargin: "-20% 0px -70% 0px", threshold: 0.01 });

    sections.forEach(s => io.observe(s));
})();