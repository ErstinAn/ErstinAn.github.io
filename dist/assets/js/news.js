(() => {
  const list = document.querySelector('.news-list');
  if (!list) return;

  const visibleItems = Array.from(list.children).slice(0, 2);
  const updateHeight = () => {
    const height = visibleItems.reduce(
      (total, item) => total + item.getBoundingClientRect().height,
      0,
    );
    list.style.setProperty('--news-visible-height', `${height}px`);
  };

  updateHeight();
  const observer = new ResizeObserver(updateHeight);
  visibleItems.forEach((item) => observer.observe(item));
})();
