import os

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7

PASSPHRASE = os.getenv("PASSPHRASE", "satoricasino")

INITIAL_COINS = 1000
DAILY_BONUS = 100
BAILOUT_COINS = 500

TABLE_MAX_PLAYERS = 6
TURN_TIMEOUT_SECONDS = 30

DECK_COUNT = 6
RESHUFFLE_THRESHOLD = 60

# XP system
XP_ROUND = 10        # participation
XP_WIN = 15          # extra for winning
XP_JACKPOT = 30      # BJ / pinzoro
XP_DAILY = 5         # daily bonus
XP_ACHIEVEMENT = 50  # per achievement unlock
