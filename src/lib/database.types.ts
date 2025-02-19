export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          created_at: string
          title: string
          description: string
          type: 'sale' | 'rent'
          property_type: string
          price: number
          area: number
          rooms: number
          location: string
          images: string[]
          features: string[]
          coordinates: Json | null
          user_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          description: string
          type: 'sale' | 'rent'
          property_type: string
          price: number
          area: number
          rooms: number
          location: string
          images: string[]
          features?: string[]
          coordinates?: Json | null
          user_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          description?: string
          type?: 'sale' | 'rent'
          property_type?: string
          price?: number
          area?: number
          rooms?: number
          location?: string
          images?: string[]
          features?: string[]
          coordinates?: Json | null
          user_id?: string | null
        }
      }
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          name: string | null
          avatar_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          email: string
          name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
        }
      }
      favorites: {
        Row: {
          id: string
          created_at: string
          user_id: string
          property_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          property_id: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          property_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
