# Frontend — Local Cable Subscription Reminder & Payment Management System

Vite + React + TypeScript + Tailwind CSS v4 + React Router + TanStack Query.

## Setup

```bash
npm install
npm run dev
```

Runs on http://localhost:5173. Expects the backend API at `http://127.0.0.1:8000` (override with a
`VITE_API_BASE_URL` env var if needed).

## Routes

- `/pay/:token` — public customer payment page. Get a customer's token via
  `GET /customers/{id}` (admin API) — it's the `access_token` field. Shows plan/amount/due date and
  UPI app buttons while `payment_status` is `pending`; switches to the Submitted/Verified/Active
  checklist once a payment is submitted.
