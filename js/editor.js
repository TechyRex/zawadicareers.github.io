// Blog editor specific functions

// Initialize rich text editor
function initRichTextEditor(editorId) {
    const editor = document.getElementById(editorId);
    if (!editor) return;
    
    // Add basic rich text functionality
    editor.addEventListener('keydown', function(e) {
        // Handle Enter key for paragraphs
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.execCommand('formatBlock', false, 'p');
        }
        
        // Handle Tab key for indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('indent');
        }
    });
    
    return {
        getContent: () => editor.innerHTML,
        setContent: (content) => editor.innerHTML = content,
        clear: () => editor.innerHTML = ''
    };
}

// Format text in editor
function formatText(command, value = null) {
    document.execCommand(command, false, value);
}

// Insert image into editor
async function insertImageIntoEditor(editorId, imageUrl) {
    const editor = document.getElementById(editorId);
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = 'var(--radius-md)';
    
    range.insertNode(img);
    range.setStartAfter(img);
    selection.removeAllRanges();
    selection.addRange(range);
}

// Calculate reading time
function calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
}

// Generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Validate blog data
function validateBlogData(blogData) {
    const errors = [];
    
    if (!blogData.title || blogData.title.trim().length < 10) {
        errors.push('Title must be at least 10 characters long');
    }
    
    if (!blogData.slug || !/^[a-z0-9-]+$/.test(blogData.slug)) {
        errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
    }
    
    if (!blogData.category_id) {
        errors.push('Please select a category');
    }
    
    if (!blogData.content || blogData.content.trim().length < 100) {
        errors.push('Content must be at least 100 characters long');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Save blog draft to localStorage
function saveDraftToLocalStorage(blogData) {
    const drafts = JSON.parse(localStorage.getItem('blog_drafts') || '[]');
    const draft = {
        ...blogData,
        id: blogData.id || Date.now().toString(),
        savedAt: new Date().toISOString()
    };
    
    // Remove existing draft with same id
    const existingIndex = drafts.findIndex(d => d.id === draft.id);
    if (existingIndex > -1) {
        drafts[existingIndex] = draft;
    } else {
        drafts.push(draft);
    }
    
    localStorage.setItem('blog_drafts', JSON.stringify(drafts));
    return draft;
}

// Load draft from localStorage
function loadDraftFromLocalStorage(draftId) {
    const drafts = JSON.parse(localStorage.getItem('blog_drafts') || '[]');
    return drafts.find(d => d.id === draftId);
}

// List all drafts
function listAllDrafts() {
    return JSON.parse(localStorage.getItem('blog_drafts') || '[]');
}

// Delete draft from localStorage
function deleteDraftFromLocalStorage(draftId) {
    const drafts = JSON.parse(localStorage.getItem('blog_drafts') || '[]');
    const filteredDrafts = drafts.filter(d => d.id !== draftId);
    localStorage.setItem('blog_drafts', JSON.stringify(filteredDrafts));
    return filteredDrafts;
}

// Auto-save functionality
function setupAutoSave(editorId, saveInterval = 30000) {
    const editor = document.getElementById(editorId);
    if (!editor) return;
    
    let autoSaveTimer;
    
    editor.addEventListener('input', () => {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveDraftToLocalStorage({
                content: editor.innerHTML,
                title: document.getElementById('blogTitle')?.value || '',
                slug: document.getElementById('blogSlug')?.value || '',
                excerpt: document.getElementById('blogExcerpt')?.value || ''
            });
            showAutoSaveNotification();
        }, saveInterval);
    });
    
    return () => clearTimeout(autoSaveTimer);
}

function showAutoSaveNotification() {
    // Create or update auto-save notification
    let notification = document.getElementById('autoSaveNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'autoSaveNotification';
        notification.className = 'auto-save-notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = `Draft saved at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Image upload handler
async function handleImageUpload(file, onProgress = null) {
    return await ZawadiAPI.uploadImage(file, 'editor-images');
}

// Export editor functions
window.EditorAPI = {
    initRichTextEditor,
    formatText,
    insertImageIntoEditor,
    calculateReadingTime,
    generateSlug,
    validateBlogData,
    saveDraftToLocalStorage,
    loadDraftFromLocalStorage,
    listAllDrafts,
    deleteDraftFromLocalStorage,
    setupAutoSave,
    handleImageUpload
};

// Add editor-specific styles
const editorStyles = document.createElement('style');
editorStyles.textContent = `
    .auto-save-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--radius-md);
        font-size: 0.875rem;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
        z-index: 9999;
    }

    .auto-save-notification.show {
        opacity: 1;
        transform: translateY(0);
    }

    .editor-toolbar-btn.active {
        background: var(--primary-color);
        color: white;
    }

    .word-count {
        position: absolute;
        bottom: var(--spacing-md);
        right: var(--spacing-md);
        font-size: 0.875rem;
        color: var(--text-tertiary);
    }
`;
document.head.appendChild(editorStyles);
