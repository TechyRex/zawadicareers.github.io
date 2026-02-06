// Authentication specific functions

// Handle user registration
async function handleUserRegistration(formData) {
    const { email, password, fullName, subscribeNewsletter } = formData;
    
    try {
        const { success, error } = await ZawadiAPI.signUp(email, password, fullName);
        
        if (success) {
            // Subscribe to newsletter if selected
            if (subscribeNewsletter) {
                await ZawadiAPI.subscribeNewsletter(email, fullName, 'signup');
            }
            
            return { success: true, message: 'Account created successfully!' };
        } else {
            return { success: false, error: error || 'Failed to create account' };
        }
    } catch (error) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Handle user login
async function handleUserLogin(email, password) {
    try {
        const { success, error } = await ZawadiAPI.signIn(email, password);
        
        if (success) {
            return { success: true };
        } else {
            return { success: false, error: error || 'Invalid credentials' };
        }
    } catch (error) {
        return { success: false, error: 'Login failed. Please try again.' };
    }
}

// Handle password reset
async function handlePasswordReset(email) {
    try {
        const { error } = await ZawadiAPI.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`,
        });
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update user profile
async function updateUserProfile(userId, updates) {
    try {
        const { error } = await ZawadiAPI.supabase
            .from('users')
            .update(updates)
            .eq('id', userId);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get current user data
async function getCurrentUserData() {
    const { data: { user } } = await ZawadiAPI.supabase.auth.getUser();
    
    if (!user) return null;
    
    const { data: userData } = await ZawadiAPI.supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
    
    return userData;
}

// Check if user is subscribed to newsletter
async function checkNewsletterSubscription(email) {
    const { data } = await ZawadiAPI.supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', email)
        .single();
    
    return !!data;
}

// Toggle newsletter subscription
async function toggleNewsletterSubscription(email, name, subscribe = true) {
    if (subscribe) {
        return await ZawadiAPI.subscribeNewsletter(email, name, 'dashboard');
    } else {
        const { error } = await ZawadiAPI.supabase
            .from('newsletter_subscribers')
            .update({ is_active: false })
            .eq('email', email);
        
        if (error) throw error;
        return { success: true };
    }
}

// Export auth functions
window.AuthAPI = {
    handleUserRegistration,
    handleUserLogin,
    handlePasswordReset,
    updateUserProfile,
    getCurrentUserData,
    checkNewsletterSubscription,
    toggleNewsletterSubscription
};
