// app.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cursor Glow Effect
    const cursorGlow = document.createElement('div');
    cursorGlow.classList.add('cursor-glow');
    document.body.appendChild(cursorGlow);

    window.addEventListener('mousemove', (e) => {
        // Adjust values so the center of the glow follows the mouse smoothly
        cursorGlow.style.left = e.clientX + 'px';
        cursorGlow.style.top = e.clientY + 'px';
    });

    // 2. Scroll Reveal with Intersection Observer
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                if (!entry.target.classList.contains('component-card')) {
                    observer.unobserve(entry.target);
                } else {
                    entry.target.style.transitionDelay = '0s'; // Remove initial stagger delay so it's snappy
                }
            } else {
                if (entry.target.classList.contains('component-card')) {
                    entry.target.classList.remove('revealed');
                }
            }
        });
    }, observerOptions);

    // Find all elements to reveal
    const revealElements = document.querySelectorAll('.project-card, .section-title, header > *, .project-hero, .project-detail-content, .project-detail-content > *:not(.timeline), .component-card, .timeline-item');
    revealElements.forEach((el, index) => {
        el.classList.add('hidden-reveal');
        // Add a slight stagger for items appearing at the same time
        el.style.transitionDelay = `${(index % 5) * 0.1}s`;
        observer.observe(el);
    });

    // 3. 3D Tilt Effect on Project Cards
    const cards = document.querySelectorAll('.project-card, .project-detail-content');
    
    cards.forEach(card => {
        // Only apply 3D effect on desktop devices to prevent weird mobile behavior
        if (window.matchMedia("(min-width: 768px)").matches && card.classList.contains('project-card')) {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Max rotation: 8 degrees
                const rotateX = ((y - centerY) / centerY) * -8; 
                const rotateY = ((x - centerX) / centerX) * 8;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
            });
        }
    });

    // 4. Carousel Dots Pagination
    const carousels = document.querySelectorAll('.components-carousel');
    carousels.forEach(carousel => {
        // Create wrapper for dots
        const dotsContainer = document.createElement('div');
        dotsContainer.classList.add('carousel-dots');
        carousel.parentNode.insertBefore(dotsContainer, carousel.nextSibling);

        const cards = carousel.querySelectorAll('.component-card');
        const dots = [];

        cards.forEach((card, i) => {
            const dot = document.createElement('button');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            
            dot.addEventListener('click', () => {
                carousel.scrollTo({
                    // Compute exact scroll position factoring gap using offsetLeft
                    left: card.offsetLeft - carousel.offsetLeft,
                    behavior: 'smooth'
                });
            });
            
            dotsContainer.appendChild(dot);
            dots.push(dot);
        });

        // Update active dot based on scroll intersection
        carousel.addEventListener('scroll', () => {
            let activeIndex = 0;
            let minDistance = Infinity;
            
            cards.forEach((card, i) => {
                const carouselCenter = carousel.scrollLeft + carousel.clientWidth / 2;
                const cardCenter = card.offsetLeft - carousel.offsetLeft + card.clientWidth / 2;
                const distance = Math.abs(carouselCenter - cardCenter);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    activeIndex = i;
                }
            });

            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === activeIndex);
            });
        });
    });
});
