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

    // Toast Notification System
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'info') icon = 'fa-info-circle';

        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <div class="toast-content">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => toast.classList.add('active'), 10);

        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // Load components on start
    loadComponent('booking-container', 'components/booking.html');

    // Admin Login Handler
    const adminForm = document.getElementById('admin-login-form');
    if (adminForm) {
        adminForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const adminId = document.getElementById('admin-user').value;
            const adminPass = document.getElementById('admin-pass').value;
            
            // Mock employee credentials
            const employees = ['julian_vance', 'marco_editor', 'admin'];
            
            if (employees.includes(adminId.toLowerCase())) {
                showToast(`Welcome back, ${adminId}. Redirecting to Admin Panel...`, 'success');
                setTimeout(() => {
                    window.location.href = 'admin/admin.html';
                }, 1500);
            } else {
                showToast('Access Denied: Invalid Admin ID or Password.', 'error');
            }
        });
    }

    console.log('Lumière Studios Landing Page Initialized');
});
