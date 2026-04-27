# Backend Architecture Diagrams

This document captures the architecture of `apps/api` as it is implemented today. Every module gets a focused diagram (routes → services → repositories → tables, plus inbound and outbound events). The system-level diagram at the top shows how the pieces fit together.

The diagrams use Mermaid. They render natively in GitHub, VS Code (with the Markdown Preview Mermaid extension), and most modern markdown viewers.

---

## 1. System overview

```mermaid
flowchart TB
    %% --- Clients ---
    subgraph Clients["Clients (apps/web — Next.js 16)"]
        direction LR
        AdminUI["Admin portal"]
        ManagerUI["Manager portal"]
        WorkerUI["Worker portal"]
        AgentUI["Agent portal"]
        SupplierUI["Supplier portal"]
        StoreUI["Storefront / POS"]
    end

    %% --- API edge ---
    subgraph Edge["API edge (Fastify)"]
        Routes["Route layer<br/>• access-metadata declared per route<br/>• route-authorization middleware<br/>• problem-details error mapper"]
    end

    %% --- Backend modules ---
    subgraph API["apps/api/src/modules"]
        direction TB
        subgraph Identity["Identity & access"]
            Auth["auth"]
            Access["access-control"]
        end
        subgraph PublicId["Public identifiers"]
            PubId["public-identifiers"]
        end
        subgraph Inventory["Inventory & ownership"]
            Catalog["catalog"]
            Stock["stock"]
            Ownership["inventory-ownership"]
            Assignments["assignments"]
        end
        subgraph Commerce["Commerce & fulfillment"]
            Sales["sales"]
            Deliveries["deliveries (scaffold)"]
            Docs["official-documents"]
        end
        subgraph Coordination["Coordination"]
            Notif["notifications"]
            Msg["messaging"]
            Admin["admin"]
            Locations["locations"]
            Sys["system"]
        end
    end

    %% --- Platform infrastructure ---
    subgraph Platform["Platform infrastructure"]
        EventBus["events module<br/>(platform-event pipeline + delivery loop)"]
        DB[("PostgreSQL<br/>packages/database")]
    end

    %% --- External services ---
    subgraph External["External"]
        Resend(("Resend<br/>email"))
        OAuth(("Google OAuth"))
        R2(("Cloudflare R2<br/>media"))
    end

    Clients --> Routes
    Routes --> Identity
    Routes --> PublicId
    Routes --> Inventory
    Routes --> Commerce
    Routes --> Coordination

    Identity --> DB
    PublicId --> DB
    Inventory --> DB
    Commerce --> DB
    Coordination --> DB

    Stock -- "appendWithinTransaction" --> EventBus
    Docs -- "document.issued" --> EventBus
    EventBus -- "delivery loop" --> Notif

    Auth -- "send mail" --> Msg
    Docs -- "send mail" --> Msg
    Admin -- "send mail" --> Msg
    Msg --> Resend
    Auth --> OAuth
    Catalog --> R2

    classDef edge fill:#1F3864,stroke:#1F3864,color:#fff
    classDef mod fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef ext fill:#FFF3D9,stroke:#9C5700,color:#9C5700
    classDef infra fill:#E2EFDA,stroke:#375623,color:#375623
    class Routes edge
    class Auth,Access,PubId,Catalog,Stock,Ownership,Assignments,Sales,Deliveries,Docs,Notif,Msg,Admin,Locations,Sys mod
    class Resend,OAuth,R2 ext
    class EventBus,DB infra
```

**Key architectural choices**

- Modular monolith (ADR-0001). One Fastify process; modules are import-isolated.
- Append-only ledgers for ownership (ADR-0003). No row updates.
- SKU is the stock-bearing identity (ADR-0010). Catalog, stock, ownership, and reservations all key on `sku_id`.
- Public identifiers only on the wire (ADR-0002). Slugs and reference numbers in responses; no raw DB IDs.
- Route-level access enforcement (ADR-0004). Every protected route declares an access policy and the middleware refuses to register routes without one.
- Platform events with a durable outbox (ADR-0012, ADR-0013). Producers append in-transaction; the delivery loop fans out to subscribers.
- Browser session auth (ADR-0006). Refresh token in an HTTP-only cookie; access tokens are short-lived and carry no roles.

---

## 2. Cross-cutting infrastructure

### 2.1 `_core` — error handling and route contract

```mermaid
flowchart LR
    Service["Domain service<br/>throws AppError(code, statusCode, title, detail, details)"]
    Catch["Route handler<br/>try/catch"]
    Mapper["to-problem-details<br/>(_core/errors)"]
    HTTP["HTTP response<br/>application/problem+json"]
    Service --> Catch --> Mapper --> HTTP

    classDef m fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    class Service,Catch,Mapper,HTTP m
```

`_core/route-contract.ts` defines the access metadata that every route is required to declare. The `guard:routes` script and `route-authorization` middleware enforce that no route registers without it.

### 2.2 `events` — platform-event backbone

```mermaid
flowchart TB
    Producer["Producer service<br/>(e.g. stock-supply, official-documents)"]
    Pub["PlatformEventPipelinePublisher<br/>appendWithinTransaction()"]
    Log[("platform_events<br/>append-only log")]
    Health[("platform_event_delivery_health")]
    Loop["PlatformEventDeliveryLoop<br/>2s polling worker"]
    Bus["InMemoryPlatformEventBus<br/>(in-process subscribers)"]
    Subscriber1["NotificationProjector"]
    Subscriber2["(future subscribers)"]

    Producer -- "append within tx" --> Pub
    Pub -- "INSERT" --> Log
    Pub -- "notifyAppendCommitted()" --> Loop
    Loop -- "poll pending" --> Log
    Loop -- "track delivery" --> Health
    Loop -- "publish" --> Bus
    Bus --> Subscriber1
    Bus --> Subscriber2

    AdminUI["GET /api/admin/platform-events<br/>GET /api/admin/platform-events/health"] --> Log
    AdminUI --> Health

    classDef m fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef db fill:#E2EFDA,stroke:#375623,color:#375623
    class Producer,Pub,Loop,Bus,Subscriber1,Subscriber2,AdminUI m
    class Log,Health db
```

Events carry `actor`, `audience` (user-scoped or permission-scoped with optional location), `id`, `occurredAt`, `payload`, `resource`, `summary`, and `type`. They are persisted, not ephemeral; the delivery loop tracks per-subscription health.

---

## 3. Identity & access

### 3.1 `auth` — authentication, sessions, account recovery

```mermaid
flowchart TB
    subgraph Routes["Routes (apps/api/src/modules/auth)"]
        R1["auth.routes<br/>POST /api/auth/login<br/>POST /api/auth/logout<br/>POST /api/auth/refresh"]
        R2["auth-oauth.routes<br/>GET /api/auth/google/init<br/>GET /api/auth/google/callback"]
        R3["auth-recovery.routes<br/>POST /api/auth/password-reset<br/>POST /api/auth/email-verify"]
    end

    subgraph Services["Services"]
        Authn["authentication.service<br/>password + lockout policy"]
        Sess["session.service<br/>refresh-token cookie"]
        Reg["registration.service"]
        OAuth2["google-oauth.service"]
        Tok["access-token-authentication.service"]
        Lifecycle["user-access-lifecycle.service"]
        EmailVer["email-verification.service"]
        PwdReset["password-reset.service"]
        CurUser["current-user.service"]
        CurPerm["current-user-permission.service"]
    end

    subgraph Repos["Repositories"]
        UR["postgres-user"]
        SR["postgres-session"]
        AR["postgres-auth-user-record"]
        AS["postgres-user-account-state"]
        AE["postgres-user-auth-events"]
        OR["postgres-oauth-identity"]
        RR["postgres-user-recovery"]
    end

    subgraph DB["Tables (packages/database)"]
        T1[("users")]
        T2[("refreshTokens")]
        T3[("authEvents")]
        T4[("oauthIdentities")]
        T5[("passwordResetTokens<br/>emailVerificationTokens")]
    end

    R1 --> Authn --> UR --> T1
    R1 --> Sess --> SR --> T2
    Authn --> AE --> T3
    Authn --> AS --> T1
    R2 --> OAuth2 --> OR --> T4
    R3 --> EmailVer --> RR --> T5
    R3 --> PwdReset --> RR
    Tok --> AR --> T1
    CurUser --> UR
    CurPerm --> AccessCtrl[("access-control<br/>permission-resolution.service")]

    EmailVer -- "send mail" --> Msg[(messaging)]
    PwdReset -- "send mail" --> Msg
    OAuth2 -- "OAuth code exchange" --> Google[(Google OAuth)]

    classDef route fill:#1F3864,stroke:#1F3864,color:#fff
    classDef svc fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef ext fill:#FFF3D9,stroke:#9C5700,color:#9C5700
    class R1,R2,R3 route
    class Authn,Sess,Reg,OAuth2,Tok,Lifecycle,EmailVer,PwdReset,CurUser,CurPerm svc
    class UR,SR,AR,AS,AE,OR,RR repo
    class T1,T2,T3,T4,T5 tbl
    class Msg,Google,AccessCtrl ext
```

### 3.2 `access-control` — permission resolution

```mermaid
flowchart TB
    subgraph Inputs["Callers"]
        Mw["route-authorization middleware<br/>(every protected route)"]
        Au["auth/current-user-permission.service"]
    end

    subgraph Services
        Resolve["permission-resolution.service<br/>(role + override + cache)"]
        BasicRole["basic-user-role.service"]
    end

    subgraph Repo
        PR["postgres-permission"]
    end

    subgraph DB
        Perm[("permissions")]
        Roles[("roles")]
        RP[("rolePermissions")]
        UR[("userRoles")]
        UPO[("userPermissionOverrides<br/>append-only")]
        Aud[("permissionAudit")]
    end

    Mw --> Resolve
    Au --> Resolve
    Resolve --> PR
    BasicRole --> PR
    PR --> Perm
    PR --> Roles
    PR --> RP
    PR --> UR
    PR --> UPO
    PR --> Aud

    classDef route fill:#1F3864,stroke:#1F3864,color:#fff
    classDef svc fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    class Mw,Au route
    class Resolve,BasicRole svc
    class PR repo
    class Perm,Roles,RP,UR,UPO,Aud tbl
```

Resolution precedence (per ADR-0008): explicit user override beats role grant; deny beats allow at the same precedence.

---

## 4. Public identifiers

### 4.1 `public-identifiers` — slugs and reference numbers

```mermaid
flowchart LR
    subgraph Callers
        Cat["catalog<br/>product/category/brand slug"]
        Sales["sales<br/>invoice / credit-note ref"]
        Stock["stock<br/>supply-request ref"]
        Docs["official-documents<br/>issued-document ref"]
        Trans["stock<br/>GTN ref"]
    end

    subgraph Services
        Slug["slug.service<br/>+ slug.service.support"]
        Ref["reference-number.service<br/>+ reference-number-formats"]
    end

    subgraph Repos
        SR["postgres-slug"]
        RR["postgres-reference-number"]
    end

    subgraph DB
        S[("slugs<br/>+ slug redirects")]
        N[("reference_numbers<br/>(scoped sequences)")]
    end

    Cat --> Slug --> SR --> S
    Sales --> Ref --> RR --> N
    Stock --> Ref
    Docs --> Ref
    Trans --> Ref

    classDef svc fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef caller fill:#FFF2CC,stroke:#9C5700,color:#9C5700
    class Slug,Ref svc
    class SR,RR repo
    class S,N tbl
    class Cat,Sales,Stock,Docs,Trans caller
```

Reference-number generation runs inside the producing transaction, which is the source of uniqueness (no separate sequence service round trip). Slug allocation tracks redirect history per ADR-0009.

---

## 5. Inventory and ownership

### 5.1 `catalog` — products, variants, brands, categories, media

```mermaid
flowchart TB
    subgraph Routes["Routes"]
        AQ["catalog-admin-query.routes<br/>GET /api/admin/catalog/*"]
        AW["catalog-admin-write.routes<br/>POST/PATCH /api/admin/catalog/*"]
        AO["catalog-admin-product-options.routes"]
        BR["catalog-brand.routes"]
        MR["catalog-media.routes<br/>POST /api/catalog/media/upload"]
        MQ["catalog-manager-query.routes<br/>GET /api/catalog/products (manager)"]
    end

    subgraph Services
        ProdQ["catalog-product-query.service"]
        ProdW["catalog-product-write.service"]
        CatQ["catalog-category-query.service"]
        CatW["catalog-category-write.service"]
        BrandQ["catalog-brand-query.service"]
        BrandW["catalog-brand-write.service"]
        Media["catalog-media.service"]
        Loader["catalog-primary-image.loader<br/>(DataLoader)"]
    end

    subgraph Repos
        PQ["postgres-catalog-product-query"]
        PW["postgres-catalog-product-write<br/>+ archive-guard, delete-guard"]
        VW["postgres-catalog-variant-write"]
        VS["postgres-variant-search"]
        Opt["postgres-catalog-product-options"]
        BQ["postgres-catalog-brand-query"]
        BW["postgres-catalog-brand-write"]
        CQ["postgres-catalog-category-query"]
        CW["postgres-catalog-category-write"]
        MD["postgres-catalog-media"]
    end

    subgraph DB
        P[("products")]
        V[("productVariants")]
        Br[("catalogBrands")]
        Cg[("categories<br/>(parent hierarchy)")]
        Mm[("productMedia")]
    end

    AQ --> ProdQ --> PQ --> P
    AQ --> CatQ --> CQ --> Cg
    AQ --> BrandQ --> BQ --> Br
    AW --> ProdW --> PW --> P
    AW --> ProdW --> VW --> V
    AO --> ProdW --> Opt --> V
    BR --> BrandW --> BW --> Br
    MR --> Media --> MD --> Mm
    MQ --> ProdQ
    ProdQ --> VS --> V
    Loader --> MD

    Media --> R2[(Cloudflare R2)]
    ProdW --> Slugs[(public-identifiers<br/>slug.service)]
    BrandW --> Slugs
    CatW --> Slugs

    classDef route fill:#1F3864,stroke:#1F3864,color:#fff
    classDef svc fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef ext fill:#FFF3D9,stroke:#9C5700,color:#9C5700
    class AQ,AW,AO,BR,MR,MQ route
    class ProdQ,ProdW,CatQ,CatW,BrandQ,BrandW,Media,Loader svc
    class PQ,PW,VW,VS,Opt,BQ,BW,CQ,CW,MD repo
    class P,V,Br,Cg,Mm tbl
    class R2,Slugs ext
```

### 5.2 `stock` — balances, reservations, movements, supply requests

```mermaid
flowchart TB
    subgraph Routes
        SBA["stock-balance-admin.routes"]
        SCA["stock-count-admin.routes"]
        ARA["active-reservation-admin.routes"]
        SBL["stock-balance-location.routes<br/>(manager / worker scope)"]
        SR1["supply-request.routes"]
        SR2["supply-request-manager.routes"]
        SR3["supply-request-manager-list.routes"]
        SR4["supply-request-worker.routes"]
        SR5["supply-request-utility.routes"]
    end

    subgraph Services
        Avail["availability-query.service<br/>on_hand − reserved"]
        ActRes["active-reservation-query.service"]
        ResLife["reservation-lifecycle.service<br/>reserve / confirm / release"]
        ResExp["reservation-expiry.service<br/>(scheduled job)"]
        Adj["stock-balance-adjustment.service<br/>(row-locked mutation)"]
        Sync["stock-movement-sync.service<br/>(idempotent append)"]
        Supply["stock-supply.service"]
        SupplyEvt["stock-supply-event-publisher"]
    end

    subgraph Repos
        SB["postgres-stock-balance-query"]
        SBW["postgres-stock-balance-adjustment"]
        AR["postgres-active-reservation-query"]
        RL["postgres-reservation-lifecycle"]
        RE["postgres-reservation-expiry"]
        MS["postgres-stock-movement-sync"]
        SP["postgres-supply-request"]
        SG["postgres-supply-request-gtn"]
    end

    subgraph DB
        Bal[("stock_balances<br/>(on_hand, reserved)")]
        Res[("stock_reservations")]
        Mov[("stock_movements<br/>append-only")]
        Sup[("stock_supply_requests")]
        Gtn[("goods_transfer_notes")]
    end

    SBA --> SB --> Bal
    SCA --> SB
    ARA --> ActRes --> AR --> Res
    SBL --> SB
    SR1 --> Supply --> SP --> Sup
    SR2 --> Supply
    SR3 --> Supply
    SR4 --> Supply
    SR5 --> Avail --> SB

    ResLife --> RL --> Res
    ResLife --> Adj --> SBW --> Bal
    ResExp --> RE --> Res
    Adj --> SBW
    Sync --> MS --> Mov
    Supply --> SG --> Gtn
    Supply --> Adj
    Supply --> Sync

    Supply -- "appendWithinTransaction" --> SupplyEvt
    SupplyEvt -- "platform event<br/>request_created / dispatch_sent / receipt_confirmed" --> Bus[(events module)]
    Supply --> Ref[(public-identifiers<br/>reference-number)]

    classDef route fill:#1F3864,stroke:#1F3864,color:#fff
    classDef svc fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef ext fill:#FFF3D9,stroke:#9C5700,color:#9C5700
    class SBA,SCA,ARA,SBL,SR1,SR2,SR3,SR4,SR5 route
    class Avail,ActRes,ResLife,ResExp,Adj,Sync,Supply,SupplyEvt svc
    class SB,SBW,AR,RL,RE,MS,SP,SG repo
    class Bal,Res,Mov,Sup,Gtn tbl
    class Bus,Ref ext
```

Concurrency: `stock-balance-adjustment.service` takes a `SELECT ... FOR UPDATE` row lock on the balance row before mutating it, and the reservation lifecycle composes balance + reservation writes inside one transaction.

### 5.3 `inventory-ownership` — append-only worker accountability ledger

```mermaid
flowchart TB
    subgraph Callers
        Assign["assignments module<br/>(manager assigns / reassigns)"]
        SalesM["sales module<br/>(sales-attribution lookup)"]
        SchedRevert["scheduled handover revert"]
    end

    subgraph Services
        Q["ownership-query.service<br/>current owner / point-in-time / history"]
        W["ownership-event-write.service<br/>assign / reassign"]
        H["ownership-handover.service<br/>handover_out + handover_in,<br/>chain id, auto-revert"]
        Attr["sales-attribution.service<br/>fail-closed if no owner"]
        Pol["ownership-resolution.policy"]
    end

    subgraph Repos
        QR["postgres-ownership-query"]
        ER["postgres-ownership-event"]
        HR["postgres-ownership-handover"]
        LR["postgres-ownership-latest-event-query"]
    end

    subgraph DB
        Ev[("stock_ownership_events<br/>append-only<br/>event_type: assigned / reassigned /<br/>handover_out / handover_in / reverted / cancelled")]
    end

    Assign --> W --> ER --> Ev
    Assign --> H --> HR --> Ev
    SchedRevert --> H
    SalesM --> Attr --> Q --> QR --> Ev
    Q --> LR --> Ev
    Attr --> Pol

    classDef caller fill:#FFF2CC,stroke:#9C5700,color:#9C5700
    classDef svc fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    class Assign,SalesM,SchedRevert caller
    class Q,W,H,Attr,Pol svc
    class QR,ER,HR,LR repo
    class Ev tbl
```

There is no `effective_to` column. Reassignments and reversions are new events; correctness depends on event ordering by `(sku_id, location_id, effective_from DESC)`.

### 5.4 `assignments` — manager-driven worker / stock assignment

```mermaid
flowchart TB
    subgraph Routes
        SA["stock-assignment.routes<br/>(top-level registration)"]
        SAM["stock-assignment-manager.routes<br/>POST /api/admin/assignments/stocks"]
        SAW["stock-assignment-worker.routes<br/>GET /api/assignments/stocks (worker)"]
        MS["manager-staff.routes<br/>GET /api/admin/staff"]
    end

    subgraph Repos
        LSQ["postgres-location-staff-query"]
        WAQ["postgres-worker-assignment-query"]
    end

    SAM --> Own[(inventory-ownership<br/>ownership-event-write.service)]
    SAM --> Avail[(stock<br/>availability-query.service)]
    SAW --> WAQ --> Ev[(stock_ownership_events)]
    MS --> LSQ --> UR[(userRoles + users)]
    SAM --> Acl[(access-control<br/>permission-resolution.service)]

    classDef route fill:#1F3864,stroke:#1F3864,color:#fff
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef ext fill:#FFF3D9,stroke:#9C5700,color:#9C5700
    class SA,SAM,SAW,MS route
    class LSQ,WAQ repo
    class Ev,UR tbl
    class Own,Avail,Acl ext
```

The assignments module is intentionally thin: it shapes inputs from the manager screen, then delegates writes to `inventory-ownership` and reads to access-control + ownership.

---

## 6. Commerce and fulfillment

### 6.1 `sales` — invoices, POS, returns

```mermaid
flowchart TB
    subgraph Routes
        POS["pos-sale.routes<br/>POST /api/pos/sales<br/>GET /api/pos/invoices/:reference"]
    end

    subgraph Services
        Pos["pos-sale.service"]
        Mapper["invoice-response.mapper"]
        Access["sales-route-access"]
    end

    subgraph Repos
        Inv["postgres-invoice"]
        InvQ["postgres-invoice-query"]
        InvR["postgres-invoice-return.commands"]
        Pc["postgres-pos-catalog"]
    end

    subgraph DB
        I[("invoices<br/>type: pos / portal / ecommerce / manual / credit_note")]
        L[("invoiceLineItems")]
    end

    POS --> Pos --> Inv --> I
    Pos --> Pc --> V[(productVariants)]
    Pos --> InvR --> I
    POS --> InvQ --> I
    InvQ --> L
    Pos --> Mapper

    Pos --> Attr[(inventory-ownership<br/>sales-attribution.service)]
    Pos --> Ref[(public-identifiers<br/>reference-number.service)]
    Pos --> Adj[(stock<br/>stock-movement-sync + adjustment)]

    classDef route fill:#1F3864,stroke:#1F3864,color:#fff
    classDef svc fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef ext fill:#FFF3D9,stroke:#9C5700,color:#9C5700
    class POS route
    class Pos,Mapper,Access svc
    class Inv,InvQ,InvR,Pc repo
    class I,L,V tbl
    class Attr,Ref,Adj ext
```

Sales attribution is mandatory and fails closed: if no authoritative owner exists in the ledger at sale time, the sale is rejected.

### 6.2 `deliveries` — scaffold

```mermaid
flowchart LR
    Schema[("deliveries<br/>+ delivery_items<br/>+ assignedUserId")] --- Note["Schema only.<br/>No services / routes yet (see backlog: E-00C-02..05)."]
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef note fill:#FFC7CE,stroke:#9C0006,color:#9C0006
    class Schema tbl
    class Note note
```

### 6.3 `official-documents` — issued snapshots, PDFs, settings

```mermaid
flowchart TB
    subgraph Routes
        IDR["issued-document.routes<br/>GET /api/documents/sales/:reference/snapshot<br/>GET /api/documents/sales/:reference/download<br/>GET /api/documents/gtns/:reference/snapshot<br/>GET /api/documents/gtns/:reference/download"]
        SR["official-document-settings.routes<br/>GET/POST /api/admin/documents/settings"]
    end

    subgraph Services
        Snap["issued-document-snapshot.service"]
        SalesSnap["sales-issued-document-snapshot.service"]
        GtnSnap["gtn-issued-document-snapshot.service"]
        SalesPdf["sales-issued-document-pdf"]
        GtnPdf["gtn-issued-document-pdf"]
        Settings["official-document-settings.service"]
        Preview["official-document-email-template-preview.service"]
    end

    subgraph Repos
        IDoc["postgres-issued-document"]
        SetRepo["official-document-settings.repository"]
    end

    subgraph DB
        IDocs[("issuedDocuments")]
        OS[("officialDocumentSettings<br/>(JSONB nested config)")]
    end

    IDR --> Snap --> IDoc --> IDocs
    Snap --> SalesSnap --> SalesPdf
    Snap --> GtnSnap --> GtnPdf
    SalesSnap --> Sales[(sales / invoices)]
    GtnSnap --> StockSup[(stock / supply requests + GTN)]
    SR --> Settings --> SetRepo --> OS
    Preview --> Settings

    Snap -- "platform event<br/>document.issued" --> Bus[(events module)]
    Snap --> Ref[(public-identifiers<br/>reference-number.service)]

    classDef route fill:#1F3864,stroke:#1F3864,color:#fff
    classDef svc fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef ext fill:#FFF3D9,stroke:#9C5700,color:#9C5700
    class IDR,SR route
    class Snap,SalesSnap,GtnSnap,SalesPdf,GtnPdf,Settings,Preview svc
    class IDoc,SetRepo repo
    class IDocs,OS tbl
    class Bus,Ref,Sales,StockSup ext
```

---

## 7. Coordination

### 7.1 `notifications` — projection of platform events

```mermaid
flowchart TB
    subgraph Inputs
        Bus[(events module<br/>InMemoryPlatformEventBus)]
    end

    subgraph Routes
        NR["notification.routes<br/>GET /api/notifications<br/>PATCH /api/notifications/:id"]
    end

    subgraph Services
        Proj["platform-event-notification-projector<br/>(event subscriber)"]
        NQ["notification-query.service"]
        NW["notification-write.service<br/>mark read / unread"]
        Recip["notification-recipient resolver"]
    end

    subgraph Repos
        WR["postgres-notification-write"]
        QR["postgres-notification-query"]
        RR["postgres-notification-recipient"]
        UR["postgres-user-notification"]
    end

    subgraph DB
        N[("userNotifications<br/>(status: unread / read)")]
    end

    Bus --> Proj --> Recip --> RR
    Proj --> WR --> N
    NR --> NQ --> QR --> N
    NR --> NW --> WR
    NQ --> UR --> N
    Recip --> AC[(access-control<br/>permission-resolution.service)]

    classDef route fill:#1F3864,stroke:#1F3864,color:#fff
    classDef svc fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef ext fill:#FFF3D9,stroke:#9C5700,color:#9C5700
    class NR route
    class Proj,NQ,NW,Recip svc
    class WR,QR,RR,UR repo
    class N tbl
    class Bus,AC ext
```

Audience resolution is permission-driven: if a platform event targets `inventory.read` at a location, the projector materialises one notification per user who currently holds that permission for that location.

### 7.2 `messaging` — email send and webhook ingestion

```mermaid
flowchart TB
    subgraph Routes
        EA["email-admin.routes<br/>GET /api/admin/email/deliveries"]
        EW["email-webhook.routes<br/>POST /api/webhooks/resend"]
    end

    subgraph Services
        Email["email.service<br/>(template + send)"]
        Ops["email-operations.service<br/>(queue, retry, track)"]
        Hook["resend-email-webhook.service"]
        Tpl["email-template-renderer<br/>(password-reset, email-verify, supplier-invite, …)"]
    end

    subgraph Repos
        ED["postgres-email-delivery"]
        EQ["postgres-email-delivery-query"]
        ES["postgres-email-delivery-status"]
        ERS["postgres-email-recipient-delivery-state"]
    end

    subgraph DB
        EDA[("emailDeliveryAttempts<br/>status: sent / delivered / bounced /<br/>complained / failed / delayed /<br/>suppressed / console_fallback")]
    end

    EA --> EQ --> EDA
    EW --> Hook --> ES --> EDA
    Email --> Ops --> ED --> EDA
    Email --> Tpl
    Hook --> ERS --> EDA

    Email --> Resend[(Resend API)]
    Auth[(auth<br/>password-reset / email-verify)] --> Email
    Admin[(admin<br/>supplier portal invite)] --> Email
    Docs[(official-documents<br/>document delivery)] --> Email

    classDef route fill:#1F3864,stroke:#1F3864,color:#fff
    classDef svc fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef ext fill:#FFF3D9,stroke:#9C5700,color:#9C5700
    class EA,EW route
    class Email,Ops,Hook,Tpl svc
    class ED,EQ,ES,ERS repo
    class EDA tbl
    class Resend,Auth,Admin,Docs ext
```

If Resend is not configured, `email.service` falls back to a console writer; the attempt still lands in `emailDeliveryAttempts` with `status = console_fallback` so admins can see what would have been sent.

### 7.3 `admin` — composition surface for admin and supplier portals

```mermaid
flowchart TB
    subgraph Routes
        AAR["admin-access.routes<br/>roles, permissions, audit"]
        ADR["admin-directory.routes"]
        ALQ["admin-location-query.routes"]
        ALW["admin-location-write.routes"]
        AUR["admin-user-access.routes"]
        ASR["admin-supplier.routes"]
        ASC["admin-supplier-contact.routes"]
        SPR["supplier-portal.routes"]
    end

    subgraph Services
        AccQ["admin-access-query.service"]
        AccW["admin-access-write.service"]
        LocQ["admin-location-query.service"]
        LocW["admin-location-write.service"]
        UAQ["admin-user-access-query.service"]
        UAW["admin-user-access-write.service"]
        UQ["admin-user-query.service"]
        SQ["admin-supplier-query.service"]
        SW["admin-supplier-write.service"]
    end

    subgraph Repos["Repositories (postgres-admin-*)"]
        AccR["access (query/write)"]
        LocR["location (query/write/staff)"]
        UAR["user-access (query/write/commands)"]
        UR["user-query"]
        SuppR["supplier (query/write,<br/>contact, invite, inquiry,<br/>portal-invite, procurement)"]
    end

    subgraph DB
        AC[("access-control tables")]
        L[("locations")]
        U[("users + userRoles")]
        S[("suppliers + supplierProducts<br/>+ supplierTransactions")]
    end

    AAR --> AccQ --> AccR --> AC
    AAR --> AccW --> AccR
    ALQ --> LocQ --> LocR --> L
    ALW --> LocW --> LocR
    AUR --> UAQ --> UAR --> U
    AUR --> UAW --> UAR
    ADR --> UQ --> UR --> U
    ASR --> SQ --> SuppR --> S
    ASR --> SW --> SuppR
    ASC --> SW
    SPR --> SQ
    SPR --> SW

    AccQ --> Acl[(access-control<br/>permission-resolution.service)]
    SW --> Email[(messaging<br/>supplier invite)]
    LocW --> Slug[(public-identifiers<br/>slug.service)]

    classDef route fill:#1F3864,stroke:#1F3864,color:#fff
    classDef svc fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef repo fill:#FCE4D6,stroke:#C65911,color:#C65911
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef ext fill:#FFF3D9,stroke:#9C5700,color:#9C5700
    class AAR,ADR,ALQ,ALW,AUR,ASR,ASC,SPR route
    class AccQ,AccW,LocQ,LocW,UAQ,UAW,UQ,SQ,SW svc
    class AccR,LocR,UAR,UR,SuppR repo
    class AC,L,U,S tbl
    class Acl,Email,Slug ext
```

`admin` is intentionally a composition layer: it owns admin-only screens and supplier-portal flows, and it composes services from access-control, locations, public-identifiers, and messaging. Domain rules live in the leaf modules, not here.

### 7.4 `locations` — schema only

```mermaid
flowchart LR
    L[("locations<br/>type: store / warehouse<br/>status: active / inactive<br/>geolocation, manager")] --- Note["Module is schema-only.<br/>All read/write logic lives in admin/<br/>(admin-location-query / admin-location-write)."]
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    classDef note fill:#FFF2CC,stroke:#9C5700,color:#9C5700
    class L tbl
    class Note note
```

### 7.5 `system` — health and operational endpoints

```mermaid
flowchart LR
    HR["health.routes<br/>GET /api/health"] --> DBPing[(db ping)] --> DB[(PostgreSQL)]
    classDef route fill:#1F3864,stroke:#1F3864,color:#fff
    classDef tbl fill:#E2EFDA,stroke:#375623,color:#375623
    class HR route
    class DB,DBPing tbl
```

---

## 8. End-to-end request flows

These show how the modules compose for two characteristic operations.

### 8.1 POS sale

```mermaid
sequenceDiagram
    participant Worker as Worker portal
    participant Edge as Fastify route
    participant POS as pos-sale.service
    participant Attr as sales-attribution.service
    participant OwnQ as ownership-query.service
    participant Adj as stock-balance-adjustment.service
    participant Sync as stock-movement-sync.service
    participant Ref as reference-number.service
    participant DB as PostgreSQL

    Worker->>Edge: POST /api/pos/sales (skuId, qty, location)
    Edge->>POS: validated input + actor
    POS->>Attr: resolve owner at now()
    Attr->>OwnQ: latest event for (sku, location, ≤ now)
    OwnQ-->>Attr: owner = workerId | null
    alt no owner
      Attr-->>POS: AppError SALE_NOT_ATTRIBUTABLE
      POS-->>Worker: 409 problem-details
    else owner found
      POS->>DB: BEGIN
      POS->>Adj: decrement on_hand (FOR UPDATE)
      POS->>Sync: append stock_movements row
      POS->>Ref: allocate invoice reference
      POS->>DB: INSERT invoice + line items
      POS->>DB: COMMIT
      POS-->>Worker: invoice (slug + reference)
    end
```

### 8.2 Stock supply request lifecycle (with platform events)

```mermaid
sequenceDiagram
    participant Mgr as Manager portal
    participant Edge as Fastify route
    participant Sup as stock-supply.service
    participant Pub as PlatformEventPipelinePublisher
    participant Loop as PlatformEventDeliveryLoop
    participant Notif as notification projector
    participant DB as PostgreSQL

    Mgr->>Edge: POST /api/supply-requests
    Edge->>Sup: create request
    Sup->>DB: BEGIN
    Sup->>DB: INSERT stock_supply_requests
    Sup->>Pub: appendWithinTransaction(request_created)
    Pub->>DB: INSERT platform_events
    Sup->>DB: COMMIT
    Pub->>Loop: notifyAppendCommitted()

    Loop->>DB: SELECT pending platform_events
    Loop->>Notif: deliver(request_created)
    Notif->>DB: INSERT userNotifications (audience)
    Loop->>DB: UPDATE platform_event_delivery_health
```

---

## 9. Module dependency map

This summarises the cross-module imports, which are the only sanctioned coupling between modules.

```mermaid
flowchart LR
    auth --> messaging
    auth --> accessControl[access-control]
    accessControl --> events
    catalog --> publicIds[public-identifiers]
    catalog --> r2[(R2)]
    stock --> publicIds
    stock --> events
    sales --> ownership[inventory-ownership]
    sales --> publicIds
    sales --> stock
    sales --> catalog
    assignments --> ownership
    assignments --> stock
    assignments --> accessControl
    docs[official-documents] --> sales
    docs --> stock
    docs --> publicIds
    docs --> events
    docs --> messaging
    notifications --> events
    notifications --> accessControl
    admin --> accessControl
    admin --> publicIds
    admin --> messaging
    system --> none[(no module deps)]

    classDef m fill:#D9E1F2,stroke:#1F3864,color:#1F3864
    classDef ext fill:#FFF3D9,stroke:#9C5700,color:#9C5700
    class auth,accessControl,catalog,stock,sales,ownership,assignments,docs,notifications,admin,publicIds,events,messaging,system m
    class r2,none ext
```

A module may depend only on modules to its left in this list:

```
events ▸ access-control ▸ public-identifiers ▸ messaging
       ▸ catalog ▸ inventory-ownership ▸ stock
       ▸ sales ▸ official-documents
       ▸ assignments ▸ notifications ▸ admin ▸ system
```

`auth` and `_core` sit beneath everything and are imported by every module that handles a request.

---

## 10. Where this comes from

- Code paths referenced above are real on the current `apps/api/src/modules/*` tree as of 2026-04-24.
- Architectural choices are documented in `docs/architecture/adr/0001` through `0016`.
- Workstream-specific status is in `docs/product/*-workstream-*.md` and `docs/product/production-readiness-findings.md`.
- Backlog status (Done / Partial / Not Started) tracking the same modules is in `Building_and_Refining_Product_Backlog_UPDATED.xlsx`.
