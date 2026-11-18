-- Migration: Owner User Management Update (is_active + admin_update_user_account RPC)
-- Date: 2026-11-18
-- ==============================================================================

-- 1. Pastikan kolom is_active tersedia pada tabel public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.is_active IS 'Menandakan status aktif/nonaktif akses staf karoseri';

-- 2. Pastikan ekstensi pgcrypto aktif untuk hashing password Bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Fungsi RPC aman untuk memperbarui profil & kredensial pengguna oleh Owner
CREATE OR REPLACE FUNCTION public.admin_update_user_account(
  p_target_user_id uuid,
  p_full_name text,
  p_email text,
  p_role public.user_role,
  p_is_active boolean,
  p_new_password text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role public.user_role;
  v_full_name text := btrim(COALESCE(p_full_name, ''));
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_password text := NULLIF(p_new_password, '');
  v_is_active boolean := COALESCE(p_is_active, true);
BEGIN
  -- Validasi Keamanan Mutlak: hanya pengguna login dengan role 'owner' yang diizinkan
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Owner yang dapat mengubah data pengguna.';
  END IF;

  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_role IS DISTINCT FROM 'owner'::public.user_role THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Owner yang dapat mengubah data pengguna.';
  END IF;

  -- Validasi target pengguna & input
  IF p_target_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_target_user_id
  ) THEN
    RAISE EXCEPTION 'Pengguna target tidak ditemukan.';
  END IF;

  IF v_full_name = '' THEN
    RAISE EXCEPTION 'Nama lengkap wajib diisi.';
  END IF;

  IF v_email = '' OR position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION 'Alamat email tidak valid.';
  END IF;

  -- Proteksi mandiri Owner: cegah penurunan role dari owner atau penonaktifan diri sendiri
  IF p_target_user_id = v_caller_id THEN
    IF p_role IS DISTINCT FROM 'owner'::public.user_role THEN
      RAISE EXCEPTION 'Akses ditolak: Owner tidak dapat mengubah role akun miliknya sendiri.';
    END IF;
    IF v_is_active = false THEN
      RAISE EXCEPTION 'Akses ditolak: Owner tidak dapat menonaktifkan akun miliknya sendiri.';
    END IF;
  END IF;

  IF v_password IS NOT NULL AND char_length(v_password) < 6 THEN
    RAISE EXCEPTION 'Password baru minimal harus 6 karakter.';
  END IF;

  -- Update tabel public.profiles
  UPDATE public.profiles
  SET
    full_name = v_full_name,
    email = v_email,
    role = p_role,
    is_active = v_is_active
  WHERE id = p_target_user_id;

  -- Update tabel auth.users (sinkronkan email, metadata, dan password jika diisi)
  UPDATE auth.users
  SET
    email = v_email,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'full_name', v_full_name,
        'role', p_role::text
      ),
    encrypted_password = CASE
      WHEN v_password IS NOT NULL AND char_length(v_password) >= 6
        THEN crypt(v_password, gen_salt('bf'))
      ELSE encrypted_password
    END,
    updated_at = now()
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Akun autentikasi pengguna tidak ditemukan di auth.users.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'password_updated', (v_password IS NOT NULL AND char_length(v_password) >= 6)
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Email "%" sudah digunakan oleh pengguna lain.', v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_account(uuid, text, text, public.user_role, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_account(uuid, text, text, public.user_role, boolean, text) TO authenticated;
