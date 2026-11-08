# MergeMoney

## Run locally

1. Copy `.env.example` to `.env` and set `VITE_GOOGLE_CLIENT_ID` to a Google OAuth **Web application** client ID.
2. Set the same client ID as `GOOGLE_CLIENT_ID` in `expense-server/.env`. Add `http://localhost:5173` and `http://localhost:5174` as authorized JavaScript origins in Google Cloud Console.
3. Configure the backend environment using `expense-server/.env.example`, including a MongoDB URI and JWT secret.
4. To enable group settlements through Razorpay, switch your Razorpay Dashboard to **Test Mode**, create API keys, and set the test `RAZORPAY_KEY_ID` (it starts with `rzp_test_`) and `RAZORPAY_KEY_SECRET` in `expense-server/.env`. The backend rejects live keys; keep the key secret only on the server and never add it to the frontend environment.
5. Start the backend from `expense-server` with `npm install` and `npm run dev`.
6. Start the frontend from `expense-client` with `npm install` and `npm run dev`.

The backend runs on port `5001`; Vite uses port `5173` by default (or the next available port). Google sign-in requires a real matching OAuth client ID in both environment files.

## Frontend scripts

- `npm run dev` starts the Vite development server.
- `npm run build` creates the production build.
- `npm run lint` runs ESLint.
