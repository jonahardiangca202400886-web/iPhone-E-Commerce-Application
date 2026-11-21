# iPhoneHub Starter

An iPhone-only e-commerce backend starter using Node.js, Express, and Supabase PostgreSQL.

## 1. Requirements
- Node.js LTS
- VS Code
- Supabase project

## 2. Database setup
1. Open Supabase Dashboard.
2. Open SQL Editor.
3. Paste and run `database/schema.sql`.
4. In Authentication > Users, register a test account.
5. To make your own account an administrator, run this SQL using your account UUID:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR_AUTH_USER_UUID';
```

Do not let customers choose their own role.

## 3. Backend setup in VS Code
Open the `backend` folder in VS Code, then run:

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the NEW rotated Supabase keys:

```env
PORT=5000
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_NEW_SECRET_KEY
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Never commit `.env`. The Supabase secret key and AI key are backend-only.

Start the API:

```bash
npm run dev
```

Health check: `http://localhost:5000/api/v1/health`

## 4. API endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/v1/health` | Public |
| GET | `/api/v1/products` | Public |
| GET | `/api/v1/products/:id` | Public |
| POST | `/api/v1/admin/products` | Admin |
| PATCH | `/api/v1/admin/products/:id` | Admin |
| POST | `/api/v1/admin/variants/:id/stock` | Admin |
| POST | `/api/v1/trade-ins` | Signed-in customer |
| GET | `/api/v1/trade-ins/mine` | Signed-in customer |
| POST | `/api/v1/ai/recommend` | Signed-in customer |

For protected endpoints, send:
`Authorization: Bearer SUPABASE_USER_ACCESS_TOKEN`

## 5. Example: create an iPhone product
```http
POST http://localhost:5000/api/v1/admin/products
Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "name": "Apple iPhone 16 Pro",
  "model": "iPhone 16 Pro",
  "description": "256GB, Natural Titanium",
  "base_price": 59990,
  "image_url": "https://example.com/iphone.jpg"
}
```

## 6. Important project status
This is a backend/database starter, not yet the complete final-exam application. Before final submission, implement and test:
- React storefront and admin dashboard
- Full cart and checkout services with server-side price calculation
- Order creation, stock reservation, coupon rules and idempotency
- PayMongo test checkout and signed raw-body webhook verification
- Payment reconciliation and duplicate webhook protection
- OpenAPI/Swagger documentation and Postman collection
- Automated integration tests
- Additional pattern/OOP evidence and project documentation

The final project instructions require a real sandbox payment flow, an AI feature grounded in database records, API documentation, tests, and a deployed React + Express application. Do not claim those requirements are complete until they are implemented and demonstrated.
