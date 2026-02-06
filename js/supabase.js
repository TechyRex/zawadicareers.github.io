// Initialize Supabase
// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://vzikbxpvmnjfjzxxzhuo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aWtieHB2bW5qZmp6eHh6aHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTcxNTIsImV4cCI6MjA4NTk3MzE1Mn0.l8jSLctHzPrL0z2oh7-t6L1WYr4vpCWfNu_kQ8lWqT8';

// Check if Supabase is loaded
if (typeof supabase === 'undefined') {
    console.error('Supabase client not loaded. Make sure to include the Supabase CDN.');
    throw new Error('Supabase client not loaded');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test connection on load
(async function testConnection() {
    try {
        const { data, error } = await supabase.from('blogs').select('count', { count: 'exact', head: true });
        if (error) {
            console.warn('Supabase connection test failed:', error.message);
        } else {
            console.log('Supabase connected successfully');
        }
    } catch (error) {
        console.warn('Supabase connection test error:', error.message);
    }
})();

// Check if user is authenticated
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Auth check error:', error);
        return null;
    }
}

// Sign up user with improved error handling
async function signUp(email, password, fullName) {
    try {
        console.log('Starting sign up for:', email);
        
        // First, sign up with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                },
                emailRedirectTo: `${window.location.origin}/login.html`
            }
        });

        if (authError) {
            console.error('Auth sign up error:', authError);
            throw authError;
        }

        // Then create user record in users table
        if (authData.user) {
            console.log('Auth successful, creating user record...');
            
            const { error: dbError } = await supabase
                .from('users')
                .insert([
                    {
                        id: authData.user.id,
                        email: authData.user.email,
                        full_name: fullName,
                        is_subscribed: true,
                        created_at: new Date().toISOString()
                    }
                ]);

            if (dbError) {
                console.error('Database insert error:', dbError);
                
                // If duplicate user, try updating instead
                if (dbError.code === '23505') { // Unique violation
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({
                            full_name: fullName,
                            updated_at: new Date().toISOString()
                        })
                        .eq('email', email);
                    
                    if (updateError) throw updateError;
                } else {
                    throw dbError;
                }
            }

            console.log('User created successfully:', authData.user.id);
            return { 
                success: true, 
                data: authData,
                message: 'Account created successfully! Please check your email to verify your account.'
            };
        }

        throw new Error('No user data returned from sign up');
    } catch (error) {
        console.error('Sign up error:', error);
        
        // User-friendly error messages
        let errorMessage = 'Failed to create account. Please try again.';
        
        if (error.message.includes('User already registered')) {
            errorMessage = 'This email is already registered. Please try logging in instead.';
        } else if (error.message.includes('Password should be at least')) {
            errorMessage = 'Password is too weak. Please use a stronger password.';
        } else if (error.message.includes('Invalid email')) {
            errorMessage = 'Please enter a valid email address.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return { 
            success: false, 
            error: errorMessage 
        };
    }
}

// Sign in user
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        
        return { 
            success: true, 
            data,
            message: 'Login successful!' 
        };
    } catch (error) {
        console.error('Sign in error:', error);
        
        let errorMessage = 'Login failed. Please check your credentials.';
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please verify your email address before logging in.';
        }
        
        return { 
            success: false, 
            error: errorMessage 
        };
    }
}

// Sign out
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        return { 
            success: true, 
            message: 'Signed out successfully' 
        };
    } catch (error) {
        console.error('Sign out error:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// Get current session
async function getSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Get session error:', error);
        return null;
    }
}

// Forgot password
async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`,
        });

        if (error) throw error;
        
        return { 
            success: true, 
            message: 'Password reset email sent!' 
        };
    } catch (error) {
        console.error('Reset password error:', error);
        return { 
            success: false, 
            error: 'Failed to send reset email. Please try again.' 
        };
    }
}

// Update user profile
async function updateProfile(userId, updates) {
    try {
        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (error) throw error;
        
        return { 
            success: true, 
            message: 'Profile updated successfully!' 
        };
    } catch (error) {
        console.error('Update profile error:', error);
        return { 
            success: false, 
            error: 'Failed to update profile.' 
        };
    }
}

// Subscribe to newsletter
async function subscribeNewsletter(email, name = '', source = 'website') {
    try {
        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .upsert([
                {
                    email,
                    name,
                    source,
                    is_active: true,
                    subscribed_at: new Date().toISOString()
                }
            ], {
                onConflict: 'email',
                ignoreDuplicates: false
            });

        if (error) throw error;
        
        return { 
            success: true, 
            message: 'Subscribed to newsletter successfully!' 
        };
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        
        // If already subscribed, still return success
        if (error.code === '23505') {
            return { 
                success: true, 
                message: 'You are already subscribed to our newsletter!' 
            };
        }
        
        return { 
            success: false, 
            error: 'Failed to subscribe to newsletter.' 
        };
    }
}

// Get published blogs
async function getPublishedBlogs(limit = 10, page = 1) {
    try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('blogs')
            .select(`
                *,
                categories (*),
                admins (full_name)
            `, { count: 'exact' })
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        return { 
            success: true, 
            data, 
            pagination: { 
                page, 
                limit, 
                total: count 
            } 
        };
    } catch (error) {
        console.error('Get blogs error:', error);
        return { 
            success: false, 
            error: 'Failed to load blogs.' 
        };
    }
}

// Get categories
async function getCategories() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;
        
        return { 
            success: true, 
            data 
        };
    } catch (error) {
        console.error('Get categories error:', error);
        return { 
            success: false, 
            error: 'Failed to load categories.' 
        };
    }
}

// Export all functions
window.ZawadiAPI = {
    supabase,
    checkAuth,
    signUp,
    signIn,
    signOut,
    getSession,
    resetPassword,
    updateProfile,
    subscribeNewsletter,
    getPublishedBlogs,
    getCategories
};

// Also export for debugging
console.log('ZawadiAPI initialized successfully');
