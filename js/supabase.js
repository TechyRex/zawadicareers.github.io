// Initialize Supabase
const supabaseUrl = 'https://vzikbxpvmnjfjzxxzhuo.supabase.co'; // Replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aWtieHB2bW5qZmp6eHh6aHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTcxNTIsImV4cCI6MjA4NTk3MzE1Mn0.l8jSLctHzPrL0z2oh7-t6L1WYr4vpCWfNu_kQ8lWqT8'; // Replace with your Supabase anon key

const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// Check if user is authenticated
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Sign up user
async function signUp(email, password, fullName) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        if (error) throw error;

        // Create user record in users table
        if (data.user) {
            const { error: dbError } = await supabase
                .from('users')
                .insert([
                    {
                        id: data.user.id,
                        email: data.user.email,
                        full_name: fullName,
                        is_subscribed: true
                    }
                ]);

            if (dbError) throw dbError;
        }

        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
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
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Sign out
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Admin sign in
async function adminSignIn(email, password) {
    try {
        // First authenticate with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) throw authError;

        // Check if user exists in admins table
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .single();

        if (adminError || !adminData) {
            // Sign out if not an admin
            await supabase.auth.signOut();
            throw new Error('Access denied. Admin privileges required.');
        }

        // Update last login
        await supabase
            .from('admins')
            .update({ last_login: new Date().toISOString() })
            .eq('id', adminData.id);

        return { 
            success: true, 
            data: { 
                user: authData.user,
                admin: adminData
            } 
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Check if user is admin
async function isAdmin() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', user.email)
            .single();

        return !error && data;
    } catch (error) {
        return false;
    }
}

// Get all published blogs
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
        return { success: false, error: error.message };
    }
}

// Get blog by slug
async function getBlogBySlug(slug) {
    try {
        const { data, error } = await supabase
            .from('blogs')
            .select(`
                *,
                categories (*),
                admins (full_name),
                blog_sections (*)
            `)
            .eq('slug', slug)
            .eq('status', 'published')
            .single();

        if (error) throw error;

        // Increment view count
        await supabase.rpc('increment_blog_views', { blog_slug: slug });

        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get blog sections
async function getBlogSections(blogId) {
    try {
        const { data, error } = await supabase
            .from('blog_sections')
            .select('*')
            .eq('blog_id', blogId)
            .order('section_order', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Create new blog (admin only)
async function createBlog(blogData, sections) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Authentication required');

        // Check if admin
        const { data: admin } = await supabase
            .from('admins')
            .select('*')
            .eq('email', user.email)
            .single();

        if (!admin) throw new Error('Admin privileges required');

        // Create blog
        const { data: blog, error: blogError } = await supabase
            .from('blogs')
            .insert([{
                ...blogData,
                author_id: admin.id,
                published_at: blogData.status === 'published' ? new Date().toISOString() : null
            }])
            .select()
            .single();

        if (blogError) throw blogError;

        // Create sections
        if (sections && sections.length > 0) {
            const sectionsWithBlogId = sections.map((section, index) => ({
                ...section,
                blog_id: blog.id,
                section_order: index + 1
            }));

            const { error: sectionsError } = await supabase
                .from('blog_sections')
                .insert(sectionsWithBlogId);

            if (sectionsError) throw sectionsError;
        }

        return { success: true, data: blog };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update blog (admin only)
async function updateBlog(blogId, blogData, sections) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Authentication required');

        // Update blog
        const { error: blogError } = await supabase
            .from('blogs')
            .update({
                ...blogData,
                updated_at: new Date().toISOString()
            })
            .eq('id', blogId);

        if (blogError) throw blogError;

        // Update sections if provided
        if (sections) {
            // Delete existing sections
            await supabase
                .from('blog_sections')
                .delete()
                .eq('blog_id', blogId);

            // Insert new sections
            const sectionsWithBlogId = sections.map((section, index) => ({
                ...section,
                blog_id: blogId,
                section_order: index + 1
            }));

            const { error: sectionsError } = await supabase
                .from('blog_sections')
                .insert(sectionsWithBlogId);

            if (sectionsError) throw sectionsError;
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Upload image
async function uploadImage(file, folder = 'blog-images') {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('zawadi-assets')
            .upload(fileName, file);

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('zawadi-assets')
            .getPublicUrl(fileName);

        return { success: true, url: publicUrl };
    } catch (error) {
        return { success: false, error: error.message };
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
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Add comment
async function addComment(blogId, commentData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const comment = {
            blog_id: blogId,
            content: commentData.content,
            created_at: new Date().toISOString()
        };

        // Add user info if logged in
        if (user) {
            comment.user_id = user.id;
        } else {
            comment.user_name = commentData.name;
            comment.user_email = commentData.email;
        }

        const { data, error } = await supabase
            .from('comments')
            .insert([comment])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get comments for blog
async function getComments(blogId) {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                users (full_name, avatar_url)
            `)
            .eq('blog_id', blogId)
            .eq('is_approved', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Toggle like on blog
async function toggleBlogLike(blogId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Please sign in to like articles');

        // Check if already liked
        const { data: existingLike } = await supabase
            .from('blog_likes')
            .select('*')
            .eq('blog_id', blogId)
            .eq('user_id', user.id)
            .single();

        if (existingLike) {
            // Unlike
            await supabase
                .from('blog_likes')
                .delete()
                .eq('id', existingLike.id);

            await supabase.rpc('decrement_blog_likes', { blog_id: blogId });
            return { success: true, liked: false };
        } else {
            // Like
            await supabase
                .from('blog_likes')
                .insert([{ blog_id: blogId, user_id: user.id }]);

            await supabase.rpc('increment_blog_likes', { blog_id: blogId });
            return { success: true, liked: true };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Check if user liked blog
async function checkBlogLike(blogId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: true, liked: false };

        const { data, error } = await supabase
            .from('blog_likes')
            .select('*')
            .eq('blog_id', blogId)
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
        
        return { success: true, liked: !!data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Update reading progress
async function updateReadingProgress(blogId, sectionIndex, totalSections, timeSpent = 0) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Authentication required' };

        const isCompleted = sectionIndex >= totalSections - 1;

        const progressData = {
            user_id: user.id,
            blog_id: blogId,
            section_index: sectionIndex,
            total_sections: totalSections,
            time_spent: timeSpent,
            last_read_at: new Date().toISOString(),
            is_completed: isCompleted
        };

        // Check if progress exists
        const { data: existingProgress } = await supabase
            .from('reading_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('blog_id', blogId)
            .single();

        let result;
        if (existingProgress) {
            result = await supabase
                .from('reading_progress')
                .update(progressData)
                .eq('id', existingProgress.id);
        } else {
            result = await supabase
                .from('reading_progress')
                .insert([progressData]);
        }

        if (result.error) throw result.error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get user reading progress
async function getUserReadingProgress() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: true, data: [] };

        const { data, error } = await supabase
            .from('reading_progress')
            .select(`
                *,
                blogs (*, categories (*))
            `)
            .eq('user_id', user.id)
            .order('last_read_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Subscribe to newsletter
async function subscribeNewsletter(email, name, source = 'popup') {
    try {
        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .upsert([{
                email,
                name,
                source,
                subscribed_at: new Date().toISOString()
            }], {
                onConflict: 'email',
                ignoreDuplicates: false
            });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get dashboard analytics (admin only)
async function getDashboardAnalytics(timeRange = '7d') {
    try {
        // Get date range
        const now = new Date();
        let startDate = new Date();
        
        switch (timeRange) {
            case '24h':
                startDate.setDate(now.getDate() - 1);
                break;
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
        }

        // Get total blogs
        const { count: totalBlogs } = await supabase
            .from('blogs')
            .select('*', { count: 'exact', head: true });

        // Get published blogs
        const { count: publishedBlogs } = await supabase
            .from('blogs')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published');

        // Get total users
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        // Get new subscribers in time range
        const { count: newSubscribers } = await supabase
            .from('newsletter_subscribers')
            .select('*', { count: 'exact', head: true })
            .gte('subscribed_at', startDate.toISOString());

        // Get total comments
        const { count: totalComments } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true });

        // Get blog views in time range
        const { data: blogViewsData } = await supabase
            .from('blogs')
            .select('views')
            .gte('published_at', startDate.toISOString());

        const totalViews = blogViewsData?.reduce((sum, blog) => sum + (blog.views || 0), 0) || 0;

        return {
            success: true,
            data: {
                totalBlogs,
                publishedBlogs,
                totalUsers,
                newSubscribers,
                totalComments,
                totalViews,
                timeRange
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Get recent activities (admin only)
async function getRecentActivities(limit = 10) {
    try {
        const { data, error } = await supabase
            .from('analytics')
            .select(`
                *,
                users (full_name),
                blogs (title)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Export functions
window.ZawadiAPI = {
    supabase,
    checkAuth,
    signUp,
    signIn,
    signOut,
    adminSignIn,
    isAdmin,
    getPublishedBlogs,
    getBlogBySlug,
    getBlogSections,
    createBlog,
    updateBlog,
    uploadImage,
    getCategories,
    addComment,
    getComments,
    toggleBlogLike,
    checkBlogLike,
    updateReadingProgress,
    getUserReadingProgress,
    subscribeNewsletter,
    getDashboardAnalytics,
    getRecentActivities
};
