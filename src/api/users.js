import { supabase } from '../supabaseClient';

// Helper function to transform Supabase data to app format
const transformUser = (dbUser) => {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    sites: dbUser.sites || [],
    company: dbUser.company,
    isAdmin: dbUser.is_admin || false,
    is_admin: dbUser.is_admin || false,
    createdAt: dbUser.created_at,
    created_at: dbUser.created_at,
  };
};

// Create a new user
export const createUser = async (userData) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: userData.name,
        email: userData.email,
        sites: userData.sites || [],
        company: userData.company,
        is_admin: userData.isAdmin || false
      }])
      .select();

    if (error) throw error;
    return data[0] ? transformUser(data[0]) : null;
  } catch (error) {
    console.error('Error creating user:', error.message);
    throw error;
  }
};

// Get all users
export const listUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformUser);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    throw error;
  }
};

// Get a single user
export const getUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data ? transformUser(data) : null;
  } catch (error) {
    console.error('Error fetching user:', error.message);
    throw error;
  }
};

// Update a user
export const updateUser = async (userId, updates) => {
  try {
    const updateData = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.sites !== undefined) updateData.sites = updates.sites;
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) throw error;
    return data[0] ? transformUser(data[0]) : null;
  } catch (error) {
    console.error('Error updating user:', error.message);
    throw error;
  }
};

// Delete a user
export const deleteUser = async (userId) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting user:', error.message);
    throw error;
  }
};

// Get users by company
export const listUsersByCompany = async (company) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company', company)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformUser);
  } catch (error) {
    console.error('Error fetching users by company:', error.message);
    throw error;
  }
};
