-- ============================================================
-- SCHOOL POKER - Complete Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  chip_balance BIGINT NOT NULL DEFAULT 10000,
  total_hands_played INT NOT NULL DEFAULT 0,
  total_profit_loss BIGINT NOT NULL DEFAULT 0,
  biggest_pot_won BIGINT NOT NULL DEFAULT 0,
  total_wins INT NOT NULL DEFAULT 0,
  total_losses INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- POKER TABLES
-- ============================================================
CREATE TABLE public.poker_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text), 1, 6)),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  is_private BOOLEAN NOT NULL DEFAULT true,
  invite_code TEXT UNIQUE DEFAULT upper(substring(md5(random()::text), 1, 8)),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'paused', 'finished')),
  
  -- Current game state (stored as JSONB for flexibility)
  game_state JSONB DEFAULT NULL,
  
  -- Settings
  small_blind BIGINT NOT NULL DEFAULT 25,
  big_blind BIGINT NOT NULL DEFAULT 50,
  ante BIGINT NOT NULL DEFAULT 0,
  min_buy_in BIGINT NOT NULL DEFAULT 1000,
  max_buy_in BIGINT NOT NULL DEFAULT 10000,
  max_players INT NOT NULL DEFAULT 9,
  turn_timer_seconds INT NOT NULL DEFAULT 30,
  
  -- Feature flags
  allow_spectators BOOLEAN NOT NULL DEFAULT true,
  allow_chat BOOLEAN NOT NULL DEFAULT true,
  rabbit_hunting BOOLEAN NOT NULL DEFAULT false,
  run_it_twice BOOLEAN NOT NULL DEFAULT false,
  allow_straddle BOOLEAN NOT NULL DEFAULT true,
  straddle_type TEXT DEFAULT 'utg' CHECK (straddle_type IN ('utg', 'mississippi', 'button')),
  
  -- Blind timer (tournament mode)
  blind_timer_enabled BOOLEAN NOT NULL DEFAULT false,
  blind_timer_minutes INT NOT NULL DEFAULT 20,
  blind_level INT NOT NULL DEFAULT 1,
  next_blind_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE MEMBERS (players at a table)
-- ============================================================
CREATE TABLE public.table_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES public.poker_tables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  seat_number INT CHECK (seat_number BETWEEN 0 AND 8),
  chip_stack BIGINT NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('owner', 'admin', 'player', 'spectator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sitting_out', 'away', 'banned', 'left')),
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  total_bought_in BIGINT NOT NULL DEFAULT 0,
  total_cashed_out BIGINT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (table_id, user_id),
  UNIQUE (table_id, seat_number)
);

-- ============================================================
-- HANDS
-- ============================================================
CREATE TABLE public.hands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES public.poker_tables(id),
  hand_number INT NOT NULL,
  dealer_seat INT NOT NULL,
  small_blind_seat INT NOT NULL,
  big_blind_seat INT NOT NULL,
  small_blind_amount BIGINT NOT NULL,
  big_blind_amount BIGINT NOT NULL,
  ante_amount BIGINT NOT NULL DEFAULT 0,
  
  -- Card state
  community_cards JSONB NOT NULL DEFAULT '[]',
  
  -- Pot
  total_pot BIGINT NOT NULL DEFAULT 0,
  
  -- Hand snapshot
  players_snapshot JSONB NOT NULL DEFAULT '[]', -- seat positions, stacks at start
  
  -- Winner info
  winners JSONB DEFAULT NULL,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  UNIQUE (table_id, hand_number)
);

-- ============================================================
-- POTS (main pot + side pots)
-- ============================================================
CREATE TABLE public.pots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hand_id UUID NOT NULL REFERENCES public.hands(id) ON DELETE CASCADE,
  pot_number INT NOT NULL DEFAULT 0, -- 0 = main pot
  amount BIGINT NOT NULL DEFAULT 0,
  eligible_player_ids UUID[] NOT NULL DEFAULT '{}',
  winner_id UUID REFERENCES public.profiles(id),
  won_amount BIGINT,
  UNIQUE (hand_id, pot_number)
);

-- ============================================================
-- HAND ACTIONS (full action history)
-- ============================================================
CREATE TABLE public.hand_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hand_id UUID NOT NULL REFERENCES public.hands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'fold', 'check', 'call', 'raise', 'all_in', 'bet',
    'small_blind', 'big_blind', 'ante', 'straddle',
    'deal', 'flop', 'turn', 'river', 'showdown',
    'win', 'timeout_fold', 'sit_out', 'rejoin'
  )),
  amount BIGINT DEFAULT 0,
  street TEXT CHECK (street IN ('preflop', 'flop', 'turn', 'river', 'showdown')),
  sequence INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS (chip movements)
-- ============================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES public.poker_tables(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount BIGINT NOT NULL, -- positive = gain, negative = loss
  type TEXT NOT NULL CHECK (type IN (
    'buy_in', 'cash_out', 'win', 'loss', 'admin_adjust',
    'rebuy', 'addon', 'rake'
  )),
  hand_id UUID REFERENCES public.hands(id),
  performed_by UUID REFERENCES public.profiles(id), -- for admin adjustments
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SESSIONS (game sessions for tracking)
-- ============================================================
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES public.poker_tables(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  starting_stack BIGINT NOT NULL,
  ending_stack BIGINT,
  hands_played INT NOT NULL DEFAULT 0,
  net_profit BIGINT
);

-- ============================================================
-- ADMIN LOGS
-- ============================================================
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES public.poker_tables(id),
  performed_by UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL CHECK (action IN (
    'chip_adjust', 'kick', 'ban', 'unban', 'force_fold',
    'force_sitout', 'change_blinds', 'change_timer',
    'pause_game', 'resume_game', 'promote_admin',
    'demote_admin', 'lock_seat', 'unlock_seat',
    'reset_balance', 'close_table', 'toggle_setting'
  )),
  target_user_id UUID REFERENCES public.profiles(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEADERBOARD CACHE (refreshed by function)
-- ============================================================
CREATE TABLE public.leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'lifetime')),
  rank INT NOT NULL,
  profit_loss BIGINT NOT NULL DEFAULT 0,
  hands_played INT NOT NULL DEFAULT 0,
  win_rate NUMERIC(5,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period)
);

-- ============================================================
-- TABLE SETTINGS HISTORY (for audit)
-- ============================================================
CREATE TABLE public.table_settings_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES public.poker_tables(id),
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  setting_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FRIEND SYSTEM
-- ============================================================
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  addressee_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);

-- ============================================================
-- TABLE INVITES
-- ============================================================
CREATE TABLE public.table_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID NOT NULL REFERENCES public.poker_tables(id),
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  invited_user_id UUID REFERENCES public.profiles(id),
  invite_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_table_members_table ON table_members(table_id);
CREATE INDEX idx_table_members_user ON table_members(user_id);
CREATE INDEX idx_hands_table ON hands(table_id);
CREATE INDEX idx_hand_actions_hand ON hand_actions(hand_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_table ON transactions(table_id);
CREATE INDEX idx_admin_logs_table ON admin_logs(table_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tables_updated_at BEFORE UPDATE ON poker_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Player')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update profile stats on transaction
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type IN ('win', 'loss', 'admin_adjust') THEN
    UPDATE profiles
    SET
      total_profit_loss = total_profit_loss + NEW.amount,
      chip_balance = chip_balance + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_transaction_created
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_profile_stats();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE poker_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Profiles: readable by all authenticated, writable by owner
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Tables: viewable if member or public
CREATE POLICY "Tables viewable by members"
  ON poker_tables FOR SELECT TO authenticated
  USING (
    NOT is_private
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM table_members
      WHERE table_id = poker_tables.id AND user_id = auth.uid()
        AND status != 'banned'
    )
  );

CREATE POLICY "Authenticated users can create tables"
  ON poker_tables FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Only owner/admin can update table"
  ON poker_tables FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM table_members
      WHERE table_id = poker_tables.id AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Table members policies
CREATE POLICY "Members visible to table members"
  ON table_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM table_members tm2
      WHERE tm2.table_id = table_members.table_id
        AND tm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join tables"
  ON table_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Hands visible to table members
CREATE POLICY "Hands visible to table members"
  ON hands FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM table_members
      WHERE table_id = hands.table_id AND user_id = auth.uid()
    )
  );

-- Transactions visible to owner or admin
CREATE POLICY "Transactions visible to self and admins"
  ON transactions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM table_members
      WHERE table_id = transactions.table_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Admin logs visible to admins
CREATE POLICY "Admin logs visible to admins"
  ON admin_logs FOR SELECT TO authenticated
  USING (
    performed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM table_members
      WHERE table_id = admin_logs.table_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Leaderboard visible to all authenticated
CREATE POLICY "Leaderboard readable by all"
  ON leaderboard_cache FOR SELECT TO authenticated USING (true);

-- ============================================================
-- REALTIME PUBLICATIONS
-- ============================================================
-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE poker_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE table_members;
ALTER PUBLICATION supabase_realtime ADD TABLE hand_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
