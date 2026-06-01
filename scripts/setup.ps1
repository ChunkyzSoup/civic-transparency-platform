Copy-Item .env.example .env -Force
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
