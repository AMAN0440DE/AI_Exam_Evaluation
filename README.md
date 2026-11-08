# 💸 MergeMoney

### Personal money, shared clearly.

**MergeMoney** brings everyday expense tracking and group bill-splitting into one place. Track income and spending, share costs with the people you travel, live, or plan with, and see who owes whom—without juggling spreadsheets, chat history, and separate finance apps.

[![Open MergeMoney](https://img.shields.io/badge/Live%20app-Open%20MergeMoney-2563eb?style=for-the-badge)](https://expense-merge-v2.vercel.app/)

**Live app:** [expense-merge-v2.vercel.app](https://expense-merge-v2.vercel.app/) · **Backend health:** [expensemerge-v2.onrender.com/health](https://expensemerge-v2.onrender.com/health)

---

## 🎬 Quick demo

Try the core workflow in a few steps:

1. Open the [live app](https://expense-merge-v2.vercel.app/) and create an account or sign in.
2. Visit **Groups** and create a group for a trip, household, or shared event.
3. Add a shared expense, choose the participants, and select an equal, exact, or weighted split.
4. Open the group balances to see who owes whom; record a settlement manually or try Razorpay Checkout in test mode.
5. Visit **Finance** to see personal transactions, including synced group-expense shares.

> **Payment testing:** Razorpay is in test mode. Use Razorpay's test payment details only; no real charge or automatic payout is made.

Want to see the project code? Browse the [frontend](./expense-client) and [backend](./expense-server).

> **The problem:** Shared expenses get scattered across receipts, messages, and memory. People lose track of who paid, how a bill was split, and whether it was settled. Personal spending ends up in yet another disconnected place.
>
> **The idea:** Keep personal transactions and group expense activity together, calculate fair balances, and make the settlement history visible to the people involved.

---

## ✨ What you can do

### 👤 Keep up with personal finances

- Record income and expenses with an amount, category, date, and description.
- Review a personal finance summary and transaction history.
- Bring a member's share of group expenses into their personal transaction history.

### 👥 Split expenses with a group

- Create groups for trips, households, events, or ongoing shared costs.
- Add group expenses and choose who participated.
- Split amounts evenly, assign exact amounts, or use weighted shares.
- Review expense history, member balances, and settlements.
- See a group activity/audit history.

### 🔐 Keep access intentional

- Register with an email and password, or sign in with Google.
- Protect authenticated API routes with JWTs stored in HTTP-only cookies.
- Use role-based permissions for actions across the app.
- Assign group member roles, including read-only viewer access.

### 💳 Settle up with Razorpay

- Start an INR group settlement through Razorpay Checkout.
- Create orders and verify payment signatures on the server.
- Confirm payment status with Razorpay before recording a settlement.
- Keep Razorpay credentials on the backend; the frontend receives only the public key ID.

**Payment status:** Razorpay is configured for **test mode only** in this project. The server requires a key ID beginning with `rzp_test_` and rejects live keys. The current flow records a paid group settlement after payment verification; it does **not** implement automatic payouts to a group member.

---

## 🏗️ Architecture

The client and API are separate applications. The React client talks to the Express API over REST; the API applies authentication and permissions, runs domain logic, and persists records in MongoDB. Razorpay is an external checkout/payment-verification provider for group settlements.

```mermaid
flowchart LR
    Person([Person])

    subgraph Client["expense-client · React + Vite"]
        UI["Pages & components"]
        State["Redux state"]
        HTTP["Axios · REST requests"]
        UI <--> State
        UI --> HTTP
    end

    subgraph API["expense-server · Node.js + Express"]
        Routes["REST routes"]
        Auth["JWT authentication"]
        RBAC["Permission checks"]
        Controllers["Controllers"]
        Services["Finance, balances & split logic"]
        Routes --> Auth --> RBAC --> Controllers --> Services
    end

    DB[("MongoDB · users, groups,<br/>expenses, transactions & settlements")]
    Razorpay["Razorpay API & Checkout<br/>(test mode)"]

    Person --> UI
    HTTP <-->|JSON over HTTP| Routes
    Services <--> DB
    Controllers <-->|Create order / verify payment| Razorpay
```

### Payment lifecycle

```mermaid
sequenceDiagram
    actor Member
    participant UI as React client
    participant API as Express API
    participant RP as Razorpay
    participant DB as MongoDB

    Member->>UI: Choose recipient and amount
    UI->>API: Request settlement order
    API->>DB: Check group access and current balance
    API->>RP: Create INR order using server credentials
    RP-->>API: Order ID and amount
    API->>DB: Save pending payment
    API-->>UI: Order details and public key ID
    UI->>RP: Open Razorpay Checkout
    RP-->>UI: Payment ID, order ID, signature
    UI->>API: Submit payment details
    API->>API: Verify signature
    API->>RP: Confirm payment status and captured amount
    RP-->>API: Payment details
    API->>DB: Record settlement after verification
    API-->>UI: Settlement result
```

---

## 🧰 Technology

| Area | Technologies |
|---|---|
| Client | React 19, Vite, React Router, Redux Toolkit, Axios |
| UI | Bootstrap 5, Bootstrap Icons |
| API | Node.js, Express 5 |
| Data | MongoDB, Mongoose |
| Authentication | JWT, HTTP-only cookies, bcrypt, Google OAuth |
| Payments | Razorpay Checkout and server-side API verification |
| Tests | Node.js built-in test runner |

---

## 📁 Repository layout

```text
.
├── expense-client/                 # React single-page application
│   ├── src/
│   │   ├── components/             # Shared layouts and UI
│   │   ├── pages/                  # Home, finance, groups, login, etc.
│   │   ├── rbac/                   # Client-side permission helpers
│   │   └── redux/                  # Client state
│   ├── .env.example
│   └── package.json
├── expense-server/                 # Express REST API
│   ├── src/
│   │   ├── controllers/            # Request handlers and domain workflows
│   │   ├── dao/                    # Data access
│   │   ├── middlewares/            # Authentication and authorization
│   │   ├── model/                  # Mongoose schemas
│   │   ├── routes/                 # API route definitions
│   │   ├── services/               # Balances, splits and finance sync
│   │   └── utility/                # Shared permissions and helpers
│   ├── test/
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## 🚀 Run locally

### Prerequisites

- Node.js 20 or newer and npm
- MongoDB locally or a MongoDB connection URI
- A Google OAuth **Web application** client ID if you want Google sign-in
- Razorpay **Test Mode** API keys if you want to try online settlements

### 1. Get the code

```bash
git clone https://github.com/AMAN0440DE/ExpenseMerge_V2.git
cd ExpenseMerge_V2
```

### 2. Configure the API

```bash
cd expense-server
npm install
```

Copy `expense-server/.env.example` to `expense-server/.env` and set values for your environment:

```dotenv
MONGO_DB_CONNECTION_URI=mongodb://127.0.0.1:27017/expense-app
PORT=5001
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret

# Optional: enable Google sign-in with the same client ID used by the frontend
GOOGLE_CLIENT_ID=your-google-web-client-id

# Optional: Razorpay Dashboard > Test Mode > API Keys
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

Generate a unique, long JWT secret for your local environment. For Google sign-in, configure `http://localhost:5173` as an authorized JavaScript origin in Google Cloud Console. If Vite selects another port, add that origin too and keep `CLIENT_URL` aligned with it.

Run the API:

```bash
npm run dev
```

The API listens on port `5001` by default.

### 3. Configure and run the client

In another terminal:

```bash
cd expense-client
npm install
```

Copy `expense-client/.env.example` to `expense-client/.env`:

```dotenv
VITE_SERVER_ENDPOINT=http://localhost:5001
VITE_GOOGLE_CLIENT_ID=your-google-web-client-id
```

The Google client ID is optional unless you use Google sign-in. When enabled, it must match `GOOGLE_CLIENT_ID` in the API environment.

Start the client:

```bash
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

> **Windows PowerShell:** From the repository root, you can copy the examples with `Copy-Item expense-server/.env.example expense-server/.env` and `Copy-Item expense-client/.env.example expense-client/.env`.
>
> **Keep secrets private:** `.env` files are for local use. Never commit your JWT secret, Google credentials, or Razorpay secret. Do not put `RAZORPAY_KEY_SECRET` in the client environment.

---

## ☁️ Deploy to Render and Vercel

The client includes a Vercel rewrite at `expense-client/vercel.json`. In production, the browser sends API requests to the same Vercel origin under `/api`; Vercel forwards them to Render. This keeps the HTTP-only session cookie same-site instead of relying on cross-site cookies, which some browsers block.

### Render · API

Create a **Web Service** for this repository:

| Setting | Value |
|---|---|
| Root Directory | `expense-server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Add these environment variables in Render's service settings:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_DB_CONNECTION_URI` | Your MongoDB connection URI (for example, MongoDB Atlas) |
| `JWT_SECRET` | A long, random, private secret |
| `CLIENT_URL` | `https://expense-merge-v2.vercel.app` |
| `GOOGLE_CLIENT_ID` | The Google OAuth Web client ID, if using Google sign-in |
| `RAZORPAY_KEY_ID` | Razorpay Test Mode key ID (`rzp_test_...`), if using checkout |
| `RAZORPAY_KEY_SECRET` | Matching Razorpay Test Mode secret, if using checkout |

Render provides `PORT`; the server uses it automatically. Do not set `PORT` unless you have a specific reason. Add any email-related variables required by the email features you configure. Keep all secrets in Render's environment settings, not in the repository.

After deployment, the API health check should be available at `https://expensemerge-v2.onrender.com/health`. It returns HTTP 200 when MongoDB is connected and HTTP 503 otherwise.

### Vercel · client

Import the same repository as a Vercel project:

| Setting | Value |
|---|---|
| Root Directory | `expense-client` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Set these Vercel environment variables for **Production** (and Preview if you use preview deployments):

| Variable | Value |
|---|---|
| `VITE_SERVER_ENDPOINT` | `/api` |
| `VITE_GOOGLE_CLIENT_ID` | The same Google OAuth Web client ID as Render, if using Google sign-in |

Redeploy after changing environment variables. The Vercel rewrite forwards `/api/*` requests to `https://expensemerge-v2.onrender.com/*`; keep the Render origin in `expense-client/vercel.json` synchronized if the backend URL changes.

### OAuth and payment provider setup

- In Google Cloud Console, add `https://expense-merge-v2.vercel.app` to the OAuth Web client’s **Authorized JavaScript origins**. Keep the local origin too if you continue local development. Use the same client ID in Vercel and Render.
- Use Razorpay **Test Mode** keys while testing. The backend intentionally rejects live Razorpay keys.
- If Razorpay requires website verification or domain configuration for your account, configure the deployed Vercel domain in the Razorpay Dashboard.

---

## 🔌 API overview

In local development, routes are served by the API on `http://localhost:5001`. In the Vercel deployment, they are available through the same-origin `/api` prefix (for example, `/api/auth/login`). Protected routes require the authenticated HTTP-only cookie.

| Area | Base path | Examples |
|---|---|---|
| Authentication | `/auth` | Register, login, Google sign-in, session check, logout |
| Profile | `/profile` | Current user information |
| Personal finance | `/personal-finance` | Summary and transaction create/read/update/delete |
| Groups | `/groups` | Group membership, expenses, balances, settlements and audit history |
| User management | `/users` | Permission-controlled user administration |

---

## 🧪 Checks

Run the backend tests:

```bash
cd expense-server
npm test
```

Build and lint the client:

```bash
cd expense-client
npm run build
npm run lint
```

---

## 🗺️ Where the project can grow

Potential next steps—not features currently promised by the app—include richer reporting, budgets, notifications, multi-currency support, and deployment automation. Contributions that improve usability, correctness, accessibility, or test coverage are welcome.

---

## 🤝 Contributing

1. Fork the repository and create a focused feature branch.
2. Keep changes scoped and add or update tests where appropriate.
3. Run the relevant backend tests and client checks.
4. Open a pull request describing the user problem and the solution.

---
