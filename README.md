# HireFlow Backend

Node.js + TypeScript API for HireFlow. The service uses Prisma with SQLite by default, supports local or S3 resume storage, and exposes authentication plus job/candidate management endpoints.

## Prerequisites
- Node.js 18+ and npm
- SQLite (bundled with Prisma for local development)
- Optional: AWS credentials if you want to store resumes on S3

## Setup
1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create environment file** – copy the sample below into `.env` in the project root and adjust values as needed.
   ```env
   # App
   PORT=4000
   JWT_SECRET=changeme
   
   # Database (SQLite by default)
   DATABASE_URL="file:./dev.db"
   
   # AI
   OPENAI_API_KEY=
   
   # Resume storage
   RESUME_STORAGE_DRIVER=disk # or s3
   S3_BUCKET_NAME=
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=
   AWS_SECRET_ACCESS_KEY=
   ```

3. **Generate Prisma client and create the local DB**
   ```bash
   npx prisma db push
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   The API listens on `http://localhost:4000` by default. Adjust `PORT` to change the port.

5. **(Optional) Open Prisma Studio** to inspect the database while developing.
   ```bash
   npx prisma studio
   ```

## Database seeding
To populate every table with realistic data and ready-to-use users:

```bash
node prisma/seed.js
```

The seed script resets existing data, inserts demo users, jobs, candidates, and job/candidate relationships, and sets secure password hashes. You can log in with:
- `hiring.manager@example.com` / `Password123!`
- `recruiter@example.com` / `Password123!`

## Scripts
- `npm run dev` – start the API with hot reload
- `npm run build` – type-check and compile to `dist`
- `npm start` – run the compiled build

## Notes
- The API uses JWT for authentication; set a strong `JWT_SECRET` in production.
- Set `RESUME_STORAGE_DRIVER` to `s3` and provide AWS credentials/bucket info to upload resumes to S3. When left as `disk`, uploads are stored under `uploads/`.
