function initPromocoesCarousel() {
  const carouselContainer = document.querySelector('.promocoes-carousel-container');
  const carousel = document.querySelector('.promocoes-carousel');
  const items = document.querySelectorAll('.promocao-item');
  const arrowLeft = document.querySelector('.carousel-arrow-left');
  const arrowRight = document.querySelector('.carousel-arrow-right');
  if (!carouselContainer || !carousel || items.length === 0 || !arrowLeft || !arrowRight) {
    console.warn("Elementos do carrossel de promoções não encontrados. Verifique o HTML.");
    return;
  }
  const originalItemCount = items.length;
  const numClones = 3; 
  const originalItemsArray = Array.from(items);
  originalItemsArray.forEach(item => {
    carousel.appendChild(item.cloneNode(true));
  });
  for (let i = originalItemCount - 1; i >= 0; i--) {
    carousel.prepend(originalItemsArray[i].cloneNode(true));
  }
  const allItems = document.querySelectorAll('.promocao-item');
  const itemStyle = window.getComputedStyle(allItems[0]);
  const itemWidth = allItems[0].offsetWidth;
  const itemMarginRight = parseFloat(itemStyle.marginRight) || 0;
  const itemWidthWithMargin = itemWidth + itemMarginRight;
  carouselContainer.scrollLeft = numClones * itemWidthWithMargin;
  let isProgrammaticScroll = false;
  carouselContainer.addEventListener('scroll', () => {
    if (isProgrammaticScroll) return;
    isProgrammaticScroll = true;
    const scrollLeft = carouselContainer.scrollLeft;
    const clientWidth = carouselContainer.clientWidth;
    const totalClonedWidth = numClones * itemWidthWithMargin;
    const originalContentTotalWidth = originalItemCount * itemWidthWithMargin;
    if (scrollLeft >= totalClonedWidth + originalContentTotalWidth - clientWidth) {
      isProgrammaticScroll = true;
      carouselContainer.scrollLeft = totalClonedWidth;
      setTimeout(() => { isProgrammaticScroll = false; }, 50);
    } 
    else if (scrollLeft <= 0) {
      isProgrammaticScroll = true;
      carouselContainer.scrollLeft = totalClonedWidth + originalContentTotalWidth - clientWidth;
      setTimeout(() => { isProgrammaticScroll = false; }, 50);
    }
  }, { passive: true });
  arrowRight.addEventListener('click', () => {
    isProgrammaticScroll = true;
    carouselContainer.scrollBy({
      left: itemWidthWithMargin,
      behavior: 'smooth'
    });
    setTimeout(() => { isProgrammaticScroll = false; }, 600);
  });
  arrowLeft.addEventListener('click', () => {
    isProgrammaticScroll = true;
    carouselContainer.scrollBy({
      left: -itemWidthWithMargin,
      behavior: 'smooth'
    });
    setTimeout(() => { isProgrammaticScroll = false; }, 600);
  });
}