WITH supplier_users AS (
  SELECT DISTINCT
    users.id,
    users.slug,
    users.first_name,
    users.last_name,
    users.email,
    users.status,
    users.created_at
  FROM users
  INNER JOIN user_roles ON user_roles.user_id = users.id
  INNER JOIN roles ON roles.id = user_roles.role_id
  WHERE roles.slug = 'supplier'
    AND user_roles.revoked_at IS NULL
),
inserted_suppliers AS (
  INSERT INTO suppliers (
    slug,
    name,
    email,
    status,
    created_by,
    created_at,
    updated_at
  )
  SELECT
    supplier_users.slug,
    left(
      concat_ws(
        ' ',
        nullif(trim(concat_ws(' ', supplier_users.first_name, supplier_users.last_name)), ''),
        '(' || supplier_users.slug || ')'
      ),
      180
    ),
    supplier_users.email,
    CASE
      WHEN supplier_users.status = 'active' THEN 'active'::supplier_status
      ELSE 'inactive'::supplier_status
    END,
    supplier_users.id,
    supplier_users.created_at,
    now()
  FROM supplier_users
  ON CONFLICT (slug) DO UPDATE
    SET email = coalesce(suppliers.email, EXCLUDED.email),
        updated_at = suppliers.updated_at
  RETURNING id, slug
)
INSERT INTO supplier_contacts (
  supplier_id,
  user_id,
  first_name,
  last_name,
  email,
  is_primary,
  status,
  created_at,
  updated_at
)
SELECT
  inserted_suppliers.id,
  supplier_users.id,
  supplier_users.first_name,
  supplier_users.last_name,
  supplier_users.email,
  NOT EXISTS (
    SELECT 1
    FROM supplier_contacts existing_primary
    WHERE existing_primary.supplier_id = inserted_suppliers.id
      AND existing_primary.is_primary = true
  ),
  CASE
    WHEN supplier_users.status = 'active' THEN 'active'::supplier_contact_status
    ELSE 'inactive'::supplier_contact_status
  END,
  supplier_users.created_at,
  now()
FROM supplier_users
INNER JOIN inserted_suppliers ON inserted_suppliers.slug = supplier_users.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM supplier_contacts existing_contact
  WHERE existing_contact.supplier_id = inserted_suppliers.id
    AND existing_contact.user_id = supplier_users.id
);
