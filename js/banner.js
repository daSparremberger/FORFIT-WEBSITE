function initBanner() {
  const slides = document.querySelectorAll('.banner-slide');
  const dots = document.querySelectorAll('.dot');
  let current = 0;
  
  if (slides.length === 0 || dots.length === 0) {
    console.warn("Banner ou dots não encontrados. Tentando novamente...");
    return; 
  }

  const duration = 5000;
  let slideInterval;

  function showSlide(index) {
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => {
      dot.classList.remove('active');
      // RESETAR o ::before para o estado inicial ANTES de remover 'active' ou animar outro
      const beforeElement = dot.querySelector('::before');
      if (beforeElement) {
        beforeElement.style.animation = 'none'; // Remove a animação
        beforeElement.style.width = '0'; // Garante que a largura volte a 0
        beforeElement.style.opacity = '0'; // Garante que esteja invisível
        void beforeElement.offsetWidth; // Força um reflow para aplicar o reset instantaneamente
      }
    });

    slides[index].classList.add('active');
    dots[index].classList.add('active');
    
    // Aplicar a animação APENAS no dot ativo, após a forma oval ser assumida
    const activeBeforeElement = dots[index].querySelector('::before');
    if (activeBeforeElement) {
      activeBeforeElement.style.animation = `fillDot ${duration / 1000}s linear forwards`;
    }
  }

  function nextSlide() {
    current = (current + 1) % slides.length;
    showSlide(current);
  }

  // ESSENCIAL: Ativa o primeiro slide e dot na inicialização
  showSlide(current); 
  
  slideInterval = setInterval(nextSlide, duration);

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      clearInterval(slideInterval);
      current = index;
      showSlide(current);
      slideInterval = setInterval(nextSlide, duration); 
    });
  });
}