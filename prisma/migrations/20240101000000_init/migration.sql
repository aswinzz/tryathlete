-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "TrackerConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "garminUsername" TEXT,
    "garminPassword" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3),

    CONSTRAINT "TrackerConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "garminId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "distance" DOUBLE PRECISION,
    "calories" INTEGER,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "avgPace" DOUBLE PRECISION,
    "bestPace" DOUBLE PRECISION,
    "elevGain" DOUBLE PRECISION,
    "elevLoss" DOUBLE PRECISION,
    "steps" INTEGER,
    "rawData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLap" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "lapIndex" INTEGER NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "avgHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "avgPace" DOUBLE PRECISION,
    "zone" INTEGER,
    "startTime" TIMESTAMP(3),

    CONSTRAINT "ActivityLap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerConnection_userId_provider_key" ON "TrackerConnection"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_garminId_key" ON "Activity"("garminId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLap_activityId_lapIndex_key" ON "ActivityLap"("activityId", "lapIndex");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerConnection" ADD CONSTRAINT "TrackerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLap" ADD CONSTRAINT "ActivityLap_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
