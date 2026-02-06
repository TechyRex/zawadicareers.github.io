// DOM Elements
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.getElementById('navLinks');
const newsletterForm = document.getElementById('newsletterForm');
const featuredBlogsContainer = document.getElementById('featuredBlogs');
const popupModal = document.getElementById('popupModal');
const closePopupBtn = document.getElementById('closePopup');
const popupNewsletterForm = document.getElementById('popupNewsletterForm');

// Mobile Menu Toggle
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuBtn.innerHTML = navLinks.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
}

// Initialize Featured Blogs
async function initFeaturedBlogs() {
    if (!featuredBlogsContainer) return;

    try {
        const { success, data, error } = await ZawadiAPI.getPublishedBlogs(3);
        
        if (success && data) {
            featuredBlogsContainer.innerHTML = data.map(blog => `
                <article class="blog-card">
                    <a href="blog-detail.html?slug=${blog.slug}">
                        <div class="blog-image">
                            <img src="${blog.cover_image || 'assets/images/default-blog.jpg'}" alt="${blog.title}">
                        </div>
                        <div class="blog-content">
                            <div class="blog-meta">
                                <span class="blog-category">${blog.categories?.name || 'General'}</span>
                                <span class="blog-date">${formatDate(blog.published_at)}</span>
                            </div>
                            <h3 class="blog-title">${blog.title}</h3>
                            <p class="blog-excerpt">${blog.excerpt || ''}</p>
                            <div class="blog-footer">
                                <div class="author">By ${blog.admins?.full_name || 'Zawadi Team'}</div>
                                <div class="read-time">
                                    <i class="far fa-clock"></i> ${blog.reading_time || 5} min read
                                </div>
                            </div>
                        </div>
                    </a>
                </article>
            `).join('');
        } else {
            featuredBlogsContainer.innerHTML = `
                <div class="error-message">
                    <p>Unable to load blogs at the moment. Please try again later.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading featured blogs:', error);
        featuredBlogsContainer.innerHTML = `
            <div class="error-message">
                <p>Error loading blogs. Please refresh the page.</p>
            </div>
        `;
    }
}

// Newsletter Subscription
function handleNewsletterSubscription(form, source = 'footer') {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = form.querySelector('input[type="email"]').value;
        const name = form.querySelector('input[type="text"]')?.value || '';
        
        if (!validateEmail(email)) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
        submitBtn.disabled = true;

        try {
            const { success, error } = await ZawadiAPI.subscribeNewsletter(email, name, source);
            
            if (success) {
                showNotification('Thank you for subscribing! You\'ll receive our updates soon.', 'success');
                form.reset();
                
                // Close popup if it's from popup
                if (source === 'popup') {
                    closePopup();
                }
            } else {
                showNotification(error || 'Subscription failed. Please try again.', 'error');
            }
        } catch (error) {
            showNotification('An error occurred. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Popup Modal
function showPopup() {
    // Show popup after 30 seconds on first visit
    setTimeout(() => {
        if (!localStorage.getItem('zawadi_popup_shown')) {
            popupModal.style.display = 'flex';
            localStorage.setItem('zawadi_popup_shown', 'true');
        }
    }, 30000);

    // Show popup on exit intent
    document.addEventListener('mouseout', (e) => {
        if (e.clientY < 10 && !localStorage.getItem('zawadi_popup_shown')) {
            popupModal.style.display = 'flex';
            localStorage.setItem('zawadi_popup_shown', 'true');
        }
    });
}

function closePopup() {
    popupModal.style.display = 'none';
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 10);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function truncateText(text, maxLength = 150) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize featured blogs
    initFeaturedBlogs();

    // Initialize newsletter forms
    if (newsletterForm) {
        handleNewsletterSubscription(newsletterForm, 'footer');
    }

    if (popupNewsletterForm) {
        handleNewsletterSubscription(popupNewsletterForm, 'popup');
    }

    // Setup popup
    if (popupModal) {
        showPopup();
        closePopupBtn.addEventListener('click', closePopup);
        popupModal.addEventListener('click', (e) => {
            if (e.target === popupModal) closePopup();
        });
    }

    // Check auth status and update UI
    checkAuthStatus();
});

// Check authentication status
async function checkAuthStatus() {
    const user = await ZawadiAPI.checkAuth();
    const authLinks = document.getElementById('authLinks');
    
    if (authLinks) {
        if (user) {
            authLinks.innerHTML = `
                <a href="user-dashboard.html" class="btn btn-outline">Dashboard</a>
                <button onclick="handleSignOut()" class="btn btn-primary">Sign Out</button>
            `;
        } else {
            authLinks.innerHTML = `
                <a href="login.html" class="btn btn-outline">Sign In</a>
                <a href="signup.html" class="btn btn-primary">Get Started</a>
            `;
        }
    }
}

// Handle sign out
async function handleSignOut() {
    const { success } = await ZawadiAPI.signOut();
    if (success) {
        window.location.href = 'index.html';
    }
}

// Add notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: var(--radius-md);
        padding: var(--spacing-md) var(--spacing-lg);
        box-shadow: var(--shadow-xl);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md);
        min-width: 300px;
        max-width: 400px;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        z-index: 9999;
    }

    .notification.show {
        transform: translateX(0);
    }

    .notification-success {
        border-left: 4px solid var(--success-color);
    }

    .notification-error {
        border-left: 4px solid var(--error-color);
    }

    .notification-info {
        border-left: 4px solid var(--info-color);
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        flex: 1;
    }

    .notification-content i {
        font-size: 1.25rem;
    }

    .notification-success .notification-content i {
        color: var(--success-color);
    }

    .notification-error .notification-content i {
        color: var(--error-color);
    }

    .notification-info .notification-content i {
        color: var(--info-color);
    }

    .notification-close {
        background: none;
        border: none;
        color: var(--text-tertiary);
        cursor: pointer;
        font-size: 0.875rem;
        padding: var(--spacing-xs);
    }

    .notification-close:hover {
        color: var(--text-primary);
    }
`;

document.head.appendChild(notificationStyles);
