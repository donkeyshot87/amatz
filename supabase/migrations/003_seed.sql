-- Seed users (run after creating users in Supabase Auth dashboard)
-- Emails: itzik@amatz.co.il, nir@amatz.co.il, sheli@amatz.co.il,
--         nimrod@amatz.co.il, miri@amatz.co.il, salah@amatz.co.il, yaakov@amatz.co.il

INSERT INTO user_profiles (id, full_name, role) VALUES
  ((SELECT id FROM auth.users WHERE email = 'itzik@amatz.co.il'), 'איציק', 'developer'),
  ((SELECT id FROM auth.users WHERE email = 'nirsofferg@gmail.com'), 'ניר', 'admin'),
  ((SELECT id FROM auth.users WHERE email = 'sheli@amatz.co.il'), 'שלי', 'coordinator'),
  ((SELECT id FROM auth.users WHERE email = 'nimrod@amatz.co.il'), 'נמרוד', 'production'),
  ((SELECT id FROM auth.users WHERE email = 'miri@amatz.co.il'), 'מירי', 'finance'),
  ((SELECT id FROM auth.users WHERE email = 'salah@amatz.co.il'), 'סלאח', 'field_manager'),
  ((SELECT id FROM auth.users WHERE email = 'yaakov@amatz.co.il'), 'יעקב', 'production_manager')
ON CONFLICT (id) DO NOTHING;

-- Set default stage owners for all projects
-- (Run this after seeding users, and after creating each new project until we add owner selection to the form)
UPDATE project_stages SET owner_id = (SELECT id FROM auth.users WHERE email = 'itzik@amatz.co.il')
WHERE stage_number = 1;

UPDATE project_stages SET owner_id = (SELECT id FROM auth.users WHERE email = 'nimrod@amatz.co.il')
WHERE stage_number IN (2, 4);

UPDATE project_stages SET owner_id = (SELECT id FROM auth.users WHERE email = 'salah@amatz.co.il')
WHERE stage_number IN (3, 6, 7);

UPDATE project_stages SET owner_id = (SELECT id FROM auth.users WHERE email = 'yaakov@amatz.co.il')
WHERE stage_number = 5;
