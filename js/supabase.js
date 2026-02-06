// Supabase Configuration - REPLACE WITH YOUR ACTUAL CREDENTIALS
const SUPABASE_URL = 'https://vzikbxpvmnjfjzxxzhuo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aWtieHB2bW5qZmp6eHh6aHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTcxNTIsImV4cCI6MjA4NTk3MzE1Mn0.l8jSLctHzPrL0z2oh7-t6L1WYr4vpCWfNu_kQ8lWqT8';


// Initialize Supabase
let supabase;

try {
    // Check if Supabase is loaded from CDN
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized');
    } else {
        console.error('❌ Supabase library not loaded');
        throw new Error('Supabase CDN not loaded. Please include: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
    }
} catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
    // Create a simple mock for development
    supabase = {
        auth: {
            signUp: () => Promise.resolve({ data: { user: { id: 'test' } }, error: null }),
            signInWithPassword: () => Promise.resolve({ data: { user: { id: 'test' } }, error: null }),
            signOut: () => Promise.resolve({ error: null }),
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            getSession: () => Promise.resolve({ data: { session: null }, error: null })
        },
        from: () => ({
            select: () => Promise.resolve({ data: [], error: null }),
            insert: () => Promise.resolve({ data: [], error: null }),
            update: () => Promise.resolve({ data: [], error: null }),
            delete: () => Promise.resolve({ data: [], error: null })
        })
    };
}

// 1. Sign Up Function
async function signUp(email, password, fullName) {
    console.log('📝 Attempting sign up for:', email);
    
    try {
        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    avatar_url: ''
                }
            }
        });

        if (authError) {
            console.error('Auth error:', authError);
            return { success: false, error: authError.message };
        }

        console.log('✅ Auth created:', authData.user?.id);

        // Step 2: Create user record in database
        if (authData.user) {
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
                console.error('Database error:', dbError);
                
                // If user already exists (email conflict), update instead
                if (dbError.code === '23505') {
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({ full_name: fullName })
                        .eq('email', email);
                    
                    if (updateError) {
                        return { success: false, error: 'User exists but update failed' };
                    }
                } else {
                    return { success: false, error: 'Database error: ' + dbError.message };
                }
            }

            console.log('✅ User record created');
            return { 
                success: true, 
                message: 'Account created successfully! Please check your email to verify.',
                data: authData
            };
        }

        return { success: false, error: 'No user data returned' };
        
    } catch (error) {
        console.error('❌ Sign up error:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to create account. Please try again.' 
        };
    }
}

// 2. Sign In Function
async function signIn(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 3. Sign Out Function
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 4. Check Authentication
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        return null;
    }
}

// 5. Subscribe to Newsletter
async function subscribeNewsletter(email, name = '', source = 'signup') {
    try {
        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .insert([
                {
                    email,
                    name,
                    source,
                    subscribed_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 6. Get Published Blogs
async function getPublishedBlogs(limit = 10, page = 1) {
    try {
        const from = (page - 1) * limit;
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .range(from, from + limit - 1);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 7. Get Categories
async function getCategories() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 8. Get Blog by Slug
async function getBlogBySlug(slug) {
    try {
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 9. Get Session
async function getSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        return null;
    }
}

// 10. Reset Password
async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html'
        });
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 11. Update User Profile
async function updateUserProfile(userId, updates) {
    try {
        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 12. Check Connection
async function testConnection() {
    try {
        const { data, error } = await supabase.from('blogs').select('count', { count: 'exact', head: true });
        if (error) {
            console.warn('⚠️ Supabase connection warning:', error.message);
            return false;
        }
        console.log('✅ Supabase connection successful');
        return true;
    } catch (error) {
        console.warn('⚠️ Supabase connection error:', error.message);
        return false;
    }
}

// Initialize and test on load
(async function() {
    console.log('🚀 Initializing Zawadi Careers API...');
    const connected = await testConnection();
    if (!connected) {
        console.warn('⚠️ Running in development mode - some features may be limited');
    }
})();

// ⚠️ IMPORTANT: Export to global scope (NO ES6 exports!)
window.ZawadiAPI = {
    supabase,
    signUp,
    signIn,
    signOut,
    checkAuth,
    getSession,
    resetPassword,
    updateUserProfile,
    subscribeNewsletter,
    getPublishedBlogs,
    getCategories,
    getBlogBySlug,
    testConnection
};

console.log('✅ ZawadiAPI loaded and ready!');
