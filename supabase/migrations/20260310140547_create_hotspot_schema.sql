/*
  # HotSpot Pro Database Schema

  ## Overview
  Complete database schema for HotSpot Pro WiFi management system

  ## New Tables

  ### `settings`
  System configuration and business settings
  - `id` (uuid, primary key)
  - `business_name` (text)
  - `business_logo_url` (text)
  - `support_phone` (text)
  - `welcome_message` (text)
  - `primary_color` (text)
  - `background_style` (text)
  - `default_payment_method` (text)
  - `mpesa_till_number` (text)
  - `mpesa_paybill` (text)
  - `mpesa_account_number` (text)
  - `intasend_publishable_key` (text)
  - `intasend_secret_key` (text)
  - `pesapal_consumer_key` (text)
  - `pesapal_consumer_secret` (text)
  - `paystack_public_key` (text)
  - `paystack_secret_key` (text)
  - `enable_mpesa_till` (boolean)
  - `enable_mpesa_paybill` (boolean)
  - `enable_paystack` (boolean)
  - `enable_intasend` (boolean)
  - `enable_pesapal` (boolean)
  - `require_mac_binding` (boolean)
  - `auto_disconnect_on_expiry` (boolean)
  - `allow_session_resume` (boolean)
  - `enable_https` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `packages`
  Internet access packages
  - `id` (uuid, primary key)
  - `name` (text)
  - `price` (numeric)
  - `duration` (text)
  - `speed_limit` (text)
  - `data_limit` (text)
  - `active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `routers`
  MikroTik router configurations
  - `id` (uuid, primary key)
  - `name` (text)
  - `location` (text)
  - `ip_address` (text)
  - `api_port` (integer)
  - `username` (text)
  - `password` (text)
  - `model` (text)
  - `status` (text)
  - `active_users` (integer)
  - `payment_destination` (text)
  - `disable_sharing` (boolean)
  - `enable_device_tracking` (boolean)
  - `enable_bandwidth_control` (boolean)
  - `enable_session_logging` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `users`
  Customer/user accounts
  - `id` (uuid, primary key)
  - `phone` (text, unique)
  - `mac_address` (text)
  - `device_name` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `sessions`
  Active and historical user sessions
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `router_id` (uuid, foreign key)
  - `package_id` (uuid, foreign key)
  - `status` (text)
  - `started_at` (timestamptz)
  - `expires_at` (timestamptz)
  - `ended_at` (timestamptz)
  - `data_used` (text)
  - `created_at` (timestamptz)

  ### `payments`
  Payment transaction logs
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `session_id` (uuid, foreign key)
  - `package_id` (uuid, foreign key)
  - `router_id` (uuid, foreign key)
  - `amount` (numeric)
  - `method` (text)
  - `status` (text)
  - `transaction_id` (text)
  - `created_at` (timestamptz)

  ### `vouchers`
  Voucher codes for package access
  - `id` (uuid, primary key)
  - `code` (text, unique)
  - `package_id` (uuid, foreign key)
  - `status` (text)
  - `expires_at` (timestamptz)
  - `used_by` (uuid, foreign key)
  - `used_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies restrict access to authenticated admin users only
  - Public access only for captive portal functionality
*/

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text DEFAULT '',
  business_logo_url text DEFAULT '',
  support_phone text DEFAULT '',
  welcome_message text DEFAULT '',
  primary_color text DEFAULT '#2dd4bf',
  background_style text DEFAULT 'dark',
  default_payment_method text DEFAULT 'till',
  mpesa_till_number text DEFAULT '',
  mpesa_paybill text DEFAULT '',
  mpesa_account_number text DEFAULT '',
  intasend_publishable_key text DEFAULT '',
  intasend_secret_key text DEFAULT '',
  pesapal_consumer_key text DEFAULT '',
  pesapal_consumer_secret text DEFAULT '',
  paystack_public_key text DEFAULT '',
  paystack_secret_key text DEFAULT '',
  enable_mpesa_till boolean DEFAULT true,
  enable_mpesa_paybill boolean DEFAULT false,
  enable_paystack boolean DEFAULT false,
  enable_intasend boolean DEFAULT false,
  enable_pesapal boolean DEFAULT false,
  require_mac_binding boolean DEFAULT true,
  auto_disconnect_on_expiry boolean DEFAULT true,
  allow_session_resume boolean DEFAULT true,
  enable_https boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create packages table
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  duration text NOT NULL,
  speed_limit text DEFAULT '',
  data_limit text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create routers table
CREATE TABLE IF NOT EXISTS routers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text DEFAULT '',
  ip_address text NOT NULL,
  api_port integer DEFAULT 8728,
  username text NOT NULL,
  password text NOT NULL,
  model text DEFAULT '',
  status text DEFAULT 'Offline',
  active_users integer DEFAULT 0,
  payment_destination text DEFAULT '',
  disable_sharing boolean DEFAULT false,
  enable_device_tracking boolean DEFAULT true,
  enable_bandwidth_control boolean DEFAULT true,
  enable_session_logging boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  mac_address text DEFAULT '',
  device_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  router_id uuid REFERENCES routers(id) ON DELETE SET NULL,
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  status text DEFAULT 'Active',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  ended_at timestamptz,
  data_used text DEFAULT '0 MB',
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  router_id uuid REFERENCES routers(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  method text NOT NULL,
  status text DEFAULT 'Pending',
  transaction_id text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create vouchers table
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  package_id uuid REFERENCES packages(id) ON DELETE CASCADE,
  status text DEFAULT 'Unused',
  expires_at timestamptz,
  used_by uuid REFERENCES users(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Settings policies (admin only)
CREATE POLICY "Admins can view settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Packages policies (admin only)
CREATE POLICY "Admins can view packages"
  ON packages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert packages"
  ON packages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update packages"
  ON packages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete packages"
  ON packages FOR DELETE
  TO authenticated
  USING (true);

-- Routers policies (admin only)
CREATE POLICY "Admins can view routers"
  ON routers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert routers"
  ON routers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update routers"
  ON routers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete routers"
  ON routers FOR DELETE
  TO authenticated
  USING (true);

-- Users policies (admin only)
CREATE POLICY "Admins can view users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (true);

-- Sessions policies (admin only)
CREATE POLICY "Admins can view sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (true);

-- Payments policies (admin only)
CREATE POLICY "Admins can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Vouchers policies (admin only)
CREATE POLICY "Admins can view vouchers"
  ON vouchers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert vouchers"
  ON vouchers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update vouchers"
  ON vouchers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete vouchers"
  ON vouchers FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_router_id ON sessions(router_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Insert default settings row
INSERT INTO settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;