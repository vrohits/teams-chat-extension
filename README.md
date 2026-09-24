# Teams Chat Board - Chrome Extension & Java Backend

A collaborative real-time chat board (styled after Microsoft Teams) directly embedded into Google Chrome as a **Side Panel Extension**, powered by a **Java (Spring Boot 3)** backend and **PostgreSQL** database.

Designed specifically to allow team members working across **different networks** (remote, home, offices) to chat in real-time while browsing the web.

---

## Architecture

- **Frontend**: Chrome Extension (Manifest V3) with Chrome Side Panel API (`sidepanel.html`), Teams Fluent UI, and native STOMP WebSocket client.
- **Backend**: Java 21 + Spring Boot 3, STOMP message broker (`/ws-chat-native`), CORS support for Chrome extensions, REST APIs for channels, messages, and presence.
- **Database**: PostgreSQL (with automatic schema creation and JPA/Hibernate mapping).

---

## 1. Quick Start: Running the Backend

Project directory:
```powershell
cd C:\Users\rohit.vaghasiya\.gemini\antigravity\scratch\teams-chat-chrome-extension\backend
```

### Option A: Instant Development Mode (Zero Configuration)
Uses persistent embedded database file so you don't need any PostgreSQL credentials right away:
```powershell
& "C:\Users\rohit.vaghasiya\.m2\wrapper\dists\apache-maven-3.9.16-bin\5grr65jo27hi51sujmtcldfovl\apache-maven-3.9.16\bin\mvn.cmd" spring-boot:run "-Dspring-boot.run.profiles=dev"
```

### Option B: With PostgreSQL
Create a database named `chatdb` in your PostgreSQL instance:
```sql
CREATE DATABASE chatdb;
```
Run with your PostgreSQL credentials:
```powershell
$env:DB_URL="jdbc:postgresql://localhost:5432/chatdb"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="your_postgres_password"
& "C:\Users\rohit.vaghasiya\.m2\wrapper\dists\apache-maven-3.9.16-bin\5grr65jo27hi51sujmtcldfovl\apache-maven-3.9.16\bin\mvn.cmd" spring-boot:run
```

### Option C: With Docker Compose
```powershell
docker compose up -d
```

---

## 2. Connecting Team Members on Different Networks

Because your team members are **not on the same local network**, the backend must be accessible over the internet. You have three easy options:

### Method 1: Cloudflare Tunnel (Recommended - Free, Fast, No Port Forwarding)
1. Download [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) or install via winget:
   ```powershell
   winget install Cloudflare.cloudflared
   ```
2. Start the tunnel to your backend port 8080:
   ```powershell
   cloudflared tunnel --url http://localhost:8080
   ```
3. Cloudflare will generate a public HTTPS URL (e.g., `https://random-words.trycloudflare.com`).
4. Share this URL with your team members!

### Method 2: ngrok
1. Run:
   ```powershell
   ngrok http 8080
   ```
2. Copy the public forwarding address (e.g. `https://xxxx.ngrok-free.app`).

### Method 3: Cloud Deployment (Render, Railway, AWS, DigitalOcean)
Deploy using the provided `Dockerfile`. You will get a permanent public domain like `https://my-team-chat.onrender.com`.

---

## 3. Installing the Chrome Extension

1. Open Google Chrome.
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle switch in the top-right corner).
4. Click **Load unpacked** (button in the top-left).
5. Select the `extension` directory:
   `C:\Users\rohit.vaghasiya\.gemini\antigravity\scratch\teams-chat-chrome-extension\extension`
6. The **Teams Chat Board** extension will appear in your Chrome toolbar!

---

## 4. How Team Members Use the Extension

1. Click the **Teams Chat** icon in the Chrome toolbar.
   - The Chrome Side Panel opens on the right side of the browser window.
2. Click the **Settings (Gear icon)** in the top right of the chat panel:
   - **Server Address**: Enter the public URL (e.g. `https://random-words.trycloudflare.com` or `http://localhost:8080`).
   - **Display Name**: Enter your name (e.g. "Rohit Vaghasiya", "Alex Smith").
   - Click **Save Changes**.
3. The status indicator will turn **Green (Connected)**.
4. Select or create channels (`#general`, `#development`, `#random`), and start chatting in real time across networks!
