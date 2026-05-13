document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('main-nav');
    
    // Scroll effect for navigation
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });

    // Mobile menu toggle (Basic implementation)
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            // This is a placeholder for a more complex mobile menu
            alert('Mobile menu clicked! (To be implemented with a full overlay for premium feel)');
        });
    }

    // Smooth scroll for anchor links (Event Delegation)
    document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (anchor) {
            e.preventDefault();
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                const navHeight = nav.offsetHeight;
                let targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                
                // If the target is the hero section, scroll to the absolute top
                if (targetId === '#hero') {
                    targetPosition = 0;
                } else {
                    // If the target is a section with padding, we adjust to align the header
                    const header = target.querySelector('.section-header');
                    if (header) {
                        targetPosition = header.getBoundingClientRect().top + window.pageYOffset - navHeight;
                    }
                }
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    });

    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.2
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.portfolio-item').forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(40px)';
        item.style.transition = 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
        revealObserver.observe(item);
    });

    // Handle reveal active state in CSS via JS if needed, 
    // but better to add a CSS rule for .reveal-active
    const style = document.createElement('style');
    style.textContent = `
        .reveal-active {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // Component Loader
    async function loadComponent(id, path) {
        try {
            const response = await fetch(path);
            const html = await response.text();
            document.getElementById(id).innerHTML = html;
            
            // Re-initialize any listeners for the new content
            if (id === 'booking-container') {
                initBookingForm();
            }
        } catch (error) {
            console.error(`Error loading component from ${path}:`, error);
        }
    }

    function initBookingForm() {
        const form = document.getElementById('booking-form');
        const status = document.getElementById('form-status');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                status.textContent = 'Sending your inquiry...';
                status.className = 'form-status';

                // Simulate API call
                setTimeout(() => {
                    status.textContent = 'Thank you! We will get back to you shortly.';
                    status.className = 'form-status success';
                    form.reset();
                }, 1500);
            });
        }
    }

    // Load components on start
    loadComponent('booking-container', 'components/booking.html');

    console.log('Lumière Studios Landing Page Initialized');
});
