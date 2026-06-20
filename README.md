# ♟️ Challenger Portal

<div align="center">
  <h3>A Modern, Competitive Chess Platform</h3>
  <p>Built with Next.js App Router, Supabase, and Tailwind CSS.</p>
</div>

<br />

## ✨ Features

- **Real-time Chess Matches**: Play chess seamlessly with instant move validation powered by `chess.js` and beautiful UI via `react-chessboard`.
- **Modern Authentication**: Secure login and registration using Supabase Auth (PKCE flow enabled). Supports standard Email/Password with OTP, as well as Social Logins (Google, Discord).
- **Stunning UI/UX**: Designed with a premium dark theme, glassmorphism effects, dynamic glows, and smooth micro-animations.
- **Player Profiles**: Track your wins, losses, and roles seamlessly.
- **Responsive Design**: Play on any device, fully optimized for both desktop and mobile views.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Chess Engine**: [`chess.js`](https://github.com/jhlywa/chess.js) & [`react-chessboard`](https://github.com/Clariity/react-chessboard)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18.17 or newer) and `npm` installed.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/challenger-portal.git
   cd challenger-portal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root of the project and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the App:**
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

```text
├── app/                  # Next.js App Router (Pages, Layouts, API Routes)
│   ├── (auth)/           # Authentication pages (Portal, Setup, etc.)
│   ├── actions/          # Server Actions for form submissions
│   └── auth/callback/    # Supabase OAuth callback route
├── components/           # Reusable UI components (Navbar, Footer, Inputs)
├── lib/                  # Core utilities (Auth helpers, JWT, Game logic)
├── util/                 # Config & utility wrappers (Supabase clients)
└── public/               # Static assets (Images, icons, noise textures)
```

## 📜 License

This project is open-source and available under the MIT License.
