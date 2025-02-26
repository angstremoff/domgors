import { supabase } from '../lib/supabaseClient'
import type { Database } from '../lib/database.types'

type Property = Database['public']['Tables']['properties']['Row']
type PropertyInsert = Database['public']['Tables']['properties']['Insert']

export const propertyService = {
  async getProperties() {
    console.log('Fetching properties...');
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        user:users(name, phone),
        city:cities(name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }

    console.log('Fetched properties:', data);
    return data;
  },

  async getPropertyById(id: string) {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        user:users(name, phone),
        city:cities(name)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createProperty(property: PropertyInsert) {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({
        ...property,
        user_id: session.session.user.id
      })
      .select(`
        *,
        user:users(name, phone),
        city:cities(name)
      `)
      .single()

    if (error) throw error
    return data
  },

  async updateProperty(id: string, updates: Partial<Property>) {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteProperty(id: string) {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async toggleFavorite(propertyId: string) {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    const { data: existing, error: fetchError } = await supabase
      .from('favorites')
      .select('id')
      .match({ user_id: user.user.id, property_id: propertyId })
      .maybeSingle()

    if (fetchError) throw fetchError

    if (existing) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .match({ id: existing.id })

      if (error) throw error
      return false
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.user.id,
          property_id: propertyId
        })
        .select('id')
        .single()

      if (error) throw error
      return true
    }
  }
}
