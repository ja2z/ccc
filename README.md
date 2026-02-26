# Commerce Control Center

Prototype web app that launches Sigma as a signed JWT embed in a new browser tab when "Performance Intelligence" is selected from the Analyze menu.

## Tech Stack

- Node.js / Express (backend)
- TypeScript
- Tailwind CSS

## Setup

1. Copy `.env.example` to `.env` and configure:
   - `JWT_CLIENT_ID` - Required. Key ID for JWT signing (also used as `iss` claim).
   - `JWT_SECRET` - Required. Hex-encoded secret for HS256 signing.
   - `USER_CLIENT_ID` - Optional. Defaults to `'dnkn'`. Used in `user_attributes.client_id` and `teams`.
   - `PORT` - Optional. Server port (default 3000).

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build:
   ```bash
   npm run build
   ```

4. Start the server:
   ```bash
   npm start
   ```

   Or run in development mode (with hot reload and Tailwind watch):
   ```bash
   npm run dev
   ```

   Server control scripts (in `scripts/`):
   - `npm run server:stop` - Stop the server
   - `npm run server:start` - Start the server
   - `npm run server:restart` - Restart the server

## Usage

1. Open http://localhost:3000
2. Hover over **Analyze** in the sidebar to reveal the submenu
3. Click **Performance Intelligence** to open Sigma in a new tab with a freshly minted JWT

## Security

- Never commit `.env` to version control
- Keep `JWT_SECRET` and `JWT_CLIENT_ID` secure and rotate as needed
