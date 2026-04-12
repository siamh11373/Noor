import type { PillarScores, SerializedSalahState } from '@/types'

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
      profiles: {
        Row: {
          id: string
          display_name: string | null
          timezone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          timezone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_state: {
        Row: {
          user_id: string
          state: SerializedSalahState
          schema_version: number
          updated_at: string
        }
        Insert: {
          user_id: string
          state: SerializedSalahState
          schema_version: number
          updated_at?: string
        }
        Update: {
          state?: SerializedSalahState
          schema_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      weekly_score_snapshots: {
        Row: {
          user_id: string
          week_start: string
          total_score: number
          trend_delta: number
          pillar_scores: PillarScores
          updated_at: string
        }
        Insert: {
          user_id: string
          week_start: string
          total_score: number
          trend_delta: number
          pillar_scores: PillarScores
          updated_at?: string
        }
        Update: {
          total_score?: number
          trend_delta?: number
          pillar_scores?: PillarScores
          updated_at?: string
        }
        Relationships: []
      }
      accountability_invites: {
        Row: {
          id: string
          created_by: string
          code: string
          status: 'active' | 'accepted' | 'expired' | 'revoked'
          expires_at: string
          accepted_by: string | null
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          created_by: string
          code: string
          status?: 'active' | 'accepted' | 'expired' | 'revoked'
          expires_at: string
          accepted_by?: string | null
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'active' | 'accepted' | 'expired' | 'revoked'
          expires_at?: string
          accepted_by?: string | null
          accepted_at?: string | null
        }
        Relationships: []
      }
      accountability_connections: {
        Row: {
          id: string
          user_id: string
          peer_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          peer_user_id: string
          created_at?: string
        }
        Update: {
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      accept_accountability_invite: {
        Args: { invite_code: string }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
