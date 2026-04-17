# Catalog Module

Owns:

- products
- categories
- supplier links
- product media metadata
- product search and barcode lookup

Catalog read models must remain role-aware. Supplier views are scoped at the API layer.

## Current foundation status

- `E-03-01`: catalog persistence foundation is landing through categories,
  product shells, and stock-bearing variants
- search, supplier scoping, media, and audit history remain open follow-on
  slices
