// ============================================
// ZAWADI CAREERS - Supabase Configuration
// ============================================

// 🔧 REPLACE THESE WITH YOUR ACTUAL CREDENTIALS
const SUPABASE_URL = 'https://vzikbxpvmnjfjzxxzhuo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aWtieHB2bW5qZmp6eHh6aHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTcxNTIsImV4cCI6MjA4NTk3MzE1Mn0.l8jSLctHzPrL0z2oh7-t6L1WYr4vpCWfNu_kQ8lWqT8';

console.log('🔧 Loading Zawadi Careers Supabase API...');
console.log('📝 Supabase URL:', SUPABASE_URL);

// ============================================
// SUPABASE INITIALIZATION
// ============================================

let supabase;

try {
    // Check if Supabase is loaded
    if (typeof window.supabase === 'undefined') {
        throw new Error('Supabase CDN not loaded. Please add: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
    }
    
    // Initialize Supabase client
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    
    console.log('✅ Supabase client initialized successfully');
    
} catch (error) {
    console.error('❌ Failed to initialize Supabase:', error.message);
    
    // Create a mock for development (remove in production)
    supabase = {
        auth: {
            signUp: async (credentials) => {
                console.log('🔧 MOCK: signUp called with:', credentials.email);
                return {
                    data: {
                        user: {
                            id: 'mock-user-' + Date.now(),
                            email: credentials.email,
                            user_metadata: credentials.options?.data || {}
                        }
                    },
                    error: null
                };
            },
            signInWithPassword: async (credentials) => {
                console.log('🔧 MOCK: signInWithPassword called');
                return {
                    data: {
                        user: { id: 'mock-user', email: credentials.email },
                        session: { access_token: 'mock-token' }
                    },
                    error: null
                };
            },
            signOut: async () => ({ error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
            resetPasswordForEmail: async () => ({ error: null })
        },
        from: () => ({
            select: () => Promise.resolve({ data: [], error: null }),
            insert: () => Promise.resolve({ data: [], error: null }),
            update: () => Promise.resolve({ data: [], error: null }),
            delete: () => Promise.resolve({ data: [], error: null }),
            single: () => Promise.resolve({ data: null, error: null })
        })
    };
    
    console.warn('⚠️ Running in MOCK mode - no real database connection');
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Sign up a new user
 */
async function signUp(email, password, fullName) {
    console.log('📝 SIGN UP REQUEST:', { email, fullName });
    
    try {
        // 1. Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    avatar_url: '',
                    created_at: new Date().toISOString()
                },
                emailRedirectTo: window.location.origin + '/login.html'
            }
        });

        if (authError) {
            console.error('❌ Auth sign up failed:', authError);
            return {
                success: false,
                error: authError.message || 'Authentication failed'
            };
        }

        console.log('✅ Auth created:', authData.user?.id);

        // 2. Create user record in database (if auth successful)
        if (authData.user) {
            try {
                const { error: dbError } = await supabase
                    .from('users')
                    .insert([
                        {
                            id: authData.user.id,
                            email: authData.user.email,
                            full_name: fullName,
                            is_subscribed: true,
                            reading_stats: { articles_read: 0, total_time: 0, categories: {} },
                            saved_articles: [],
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }
                    ]);

                if (dbError) {
                    console.warn('⚠️ Could not create user record:', dbError.message);
                    // Don't fail if database insert fails - auth user is still created
                }
            } catch (dbError) {
                console.warn('⚠️ Database error (non-critical):', dbError);
            }

            return {
                success: true,
                data: authData,
                message: 'Account created successfully! Please check your email to verify your account.'
            };
        }

        return {
            success: false,
            error: 'No user data returned'
        };

    } catch (error) {
        console.error('💥 Unexpected sign up error:', error);
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.'
        };
    }
}

/**
 * Sign in existing user
 */
async function signIn(email, password) {
    console.log('🔐 SIGN IN REQUEST:', email);
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('❌ Sign in failed:', error);
            return {
                success: false,
                error: error.message || 'Invalid email or password'
            };
        }

        console.log('✅ Sign in successful:', data.user?.id);
        return {
            success: true,
            data: data,
            message: 'Login successful!'
        };

    } catch (error) {
        console.error('💥 Unexpected sign in error:', error);
        return {
            success: false,
            error: 'Login failed. Please try again.'
        };
    }
}

/**
 * Sign out current user
 */
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if user is authenticated
 */
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
            console.warn('Auth check error:', error);
            return null;
        }
        return user;
    } catch (error) {
        console.error('Auth check exception:', error);
        return null;
    }
}

/**
 * Get current session
 */
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

// ============================================
// DATABASE FUNCTIONS
// ============================================

/**
 * Subscribe to newsletter
 */
async function subscribeNewsletter(email, name = '', source = 'website') {
    console.log('📧 Newsletter subscription:', email);
    
    try {
        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .insert([
                {
                    email: email,
                    name: name,
                    source: source,
                    is_active: true,
                    subscribed_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('❌ Newsletter subscription failed:', error);
            return {
                success: false,
                error: 'Failed to subscribe to newsletter'
            };
        }

        console.log('✅ Newsletter subscribed:', email);
        return {
            success: true,
            data: data,
            message: 'Successfully subscribed to newsletter!'
        };

    } catch (error) {
        console.error('💥 Newsletter error:', error);
        return {
            success: false,
            error: 'Subscription failed. Please try again.'
        };
    }
}

/**
 * Get published blogs
 */
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
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Get blogs error:', error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Get categories
 */
async function getCategories() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Get categories error:', error);
        return { success: false, error: error.message, data: [] };
    }
}

/**
 * Get blog by slug
 */
async function getBlogBySlug(slug) {
    try {
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

        if (error) throw error;
        return { success: true, data: data };
    } catch (error) {
        console.error('Get blog error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Reset password
 */
async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html',
        });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update user profile
 */
async function updateUserProfile(userId, updates) {
    try {
        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Update profile error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Test database connection
 */
async function testConnection() {
    try {
        const { data, error } = await supabase.from('blogs').select('count', { count: 'exact', head: true });
        if (error) {
            console.warn('⚠️ Supabase connection test failed:', error.message);
            return false;
        }
        console.log('✅ Supabase connection successful');
        return true;
    } catch (error) {
        console.warn('⚠️ Supabase connection error:', error.message);
        return false;
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW OBJECT
// ============================================

// ⚠️ IMPORTANT: This attaches everything to window.ZawadiAPI
// NO export statements allowed in regular browser JavaScript!

window.ZawadiAPI = {
    // Supabase client
    supabase: supabase,
    
    // Authentication
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    checkAuth: checkAuth,
    getSession: getSession,
    resetPassword: resetPassword,
    updateUserProfile: updateUserProfile,
    
    // Database operations
    subscribeNewsletter: subscribeNewsletter,
    getPublishedBlogs: getPublishedBlogs,
    getCategories: getCategories,
    getBlogBySlug: getBlogBySlug,
    
    // Utility
    testConnection: testConnection
};

console.log('✅ ZawadiAPI initialized with functions:', Object.keys(window.ZawadiAPI));

// Test connection on load
(async function init() {
    console.log('🚀 Testing Supabase connection...');
    const connected = await testConnection();
    if (connected) {
        console.log('🎉 Zawadi Careers API ready for production!');
    } else {
        console.log('🔧 Zawadi Careers API running in development mode');
    }
})();

// ============================================
// END OF FILE - NO MORE CODE AFTER THIS
// ============================================
