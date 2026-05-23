import type { Translation } from "./ja";

export const en: Translation = {
  common: {
    connecting: "Connecting…",
    connected: "Connected",
    reconnecting: "Reconnecting…",
    backToLobby: "← Lobby",
    log: "Log",
    startGame: "Start Game",
    newRound: "New Round",
    close: "Close",
    failed: "Something went wrong",
    coinsAmount: "{n} coins",
    seconds: "{n}s",
  },
  log: {
    player_joined: "{name} joined",
    player_left: "{name} left",
    bet_placed: "bet {n}",
    auto_stand: "auto-stand (timeout)",
    achievement_unlocked: "Achievement unlocked!",
    level_up: "Level up! Lv.{n}",
  },
  reactions: {
    gg: "GG",
    nice: "Nice",
    wow: "Wow",
    ouch: "Ouch",
    lol: "LOL",
    gl: "GL",
  },
  errors: {
    auth: {
      invalid_token: "Your session is invalid. Please sign in again.",
      wrong_passphrase: "Wrong passphrase",
      display_name_required: "Display name is required",
      name_taken: "That display name is already taken",
    },
    user: {
      not_found: "User not found",
    },
    daily_bonus: {
      already_claimed: "You've already claimed today's bonus",
    },
    bailout: {
      has_coins: "You still have coins — bailout not available",
      already_today: "You've already taken today's bailout",
    },
    ad: {
      invalid_purpose: "Invalid ad purpose",
      daily_cap: "Daily ad limit reached",
      invalid_session: "Ad session is invalid or expired",
      session_mismatch: "Ad session mismatch",
      too_short: "Please watch the full ad",
    },
    leaderboard: {
      invalid_metric: "Invalid leaderboard metric",
    },
    challenge: {
      not_found: "Challenge not found",
      not_initialized: "Today's challenges aren't initialized yet",
      already_claimed: "Already claimed",
      not_completed: "Not completed yet",
    },
    shop: {
      item_not_found: "Item not found",
      achievement_locked: "Unlock via achievement",
      already_owned: "Already owned",
      insufficient_coins: "Not enough coins",
      invalid_category: "Invalid category",
      category_mismatch: "Category doesn't match the item",
      achievement_not_unlocked: "Achievement not unlocked",
      item_not_owned: "Item not owned",
    },
    bet: {
      minimum: "Minimum bet is {n} coins",
      insufficient_coins: "Not enough coins",
      insufficient_for_double: "Not enough coins to double down",
      banker_reserve: "Need 5x bet in reserve (banker pinzoro can take 5x)",
    },
    common: {
      failed: "Something went wrong",
    },
  },
  auth: {
    tagline: "Blackjack Lounge",
    login: "Login",
    register: "Register",
    enterLounge: "Enter Lounge",
    createAccount: "Create Account",
    displayName: "Display Name",
    passphrase: "Passphrase",
  },
  keyHints: {
    start: "Start",
    nextRound: "Next",
    hit: "Hit",
    stand: "Stand",
    double: "Double",
    roll: "Roll",
  },
  betArea: {
    bet: "Bet",
    max: "MAX",
    reset: "Reset",
    placeBet: "Place Bet",
    amountTooLow: "Minimum bet is 10 coins",
    amountExceedsBalance: "Exceeds your balance",
  },
  hands: {
    pinzoro: "Pinzoro",
    arashi: "Arashi",
    shigoro: "Shigoro",
    me: "Pair",
    hifumi: "Hifumi",
    menashi: "No hand",
  },
  results: {
    blackjack: "BLACKJACK!!",
    win: "WIN!",
    push: "PUSH",
    lose: "LOSS",
    bust: "BUST",
    near_miss: "SO CLOSE!",
    pinzoro: "PINZORO!!",
    arashi: "ARASHI!",
    shigoro: "SHIGORO!",
    hifumi: "HIFUMI…",
    menashi: "NO HAND",
    wakare: "WAKARE",
    nearMissDetail: {
      byOne: "Off by one…",
      byPoint: "Just {n} points short…",
      busted22: "22… one point over",
    },
  },
  blackjack: {
    reasons: {
      otherTurn: "It's another player's turn",
      busted: "Busted — no further actions",
      wrongPhase: "Not your move in this phase",
      doubleNeedsTwoCards: "Double-down only works on your first two cards",
      notEnoughCoinsForDouble: "Not enough coins to double",
    },
    otherThinking: "Another player is thinking…",
    dealerLabel: "Dealer",
    actions: {
      hit: "Hit",
      stand: "Stand",
      double: "Double",
    },
    waitingForBets: "Waiting for other bets…",
    inlineBlackjack: "BLACKJACK!",
    resultBadge: {
      win: "WIN",
      lose: "LOSE",
      push: "PUSH",
      blackjack: "BJ",
    },
  },
  chinchiro: {
    reasons: {
      wrongPhase: "Can't roll in this phase",
      otherRolling: "Another player is rolling",
      fixed: "Your hand is already locked in",
    },
    betDoneWaiting: "Bet {bet} placed — waiting for other players…",
    bankerRolling: "Banker is rolling…",
    rollDice: "Roll dice",
    rollNth: "Roll dice (throw {n} of 3)",
    bankerLabel: "Banker",
    rollCount: "{n}/3 rolls",
  },
  lobby: {
    backToGames: "← Back to game select",
    tablesTitle: "{game} tables",
    loadingTables: "Preparing tables…",
    watch: "Watch",
    chooseGame: "Choose Your Game",
    tablesOpen: "{n} tables open",
    seats: "{n}/{max} seats",
    minBet: "Min {n}",
    join: "Join",
    full: "Full",
    dailyBonus: "Daily Bonus",
    bailout: "Bailout",
    bailoutTitle: "Emergency Rescue",
    bailoutMsg: "Try not to bust again.",
    logout: "Logout",
  },
  phase: {
    blackjack: {
      waiting: "Waiting",
      betting: "Betting",
      player_turns: "Player Turns",
      dealer_turn: "Dealer's Turn",
      resolution: "Result",
    },
    chinchiro: {
      waiting: "Waiting",
      betting: "Betting",
      banker_roll: "Banker Rolling",
      player_rolls: "Player Rolls",
      resolution: "Result",
    },
  },
  games: {
    blackjack: {
      label: "Blackjack",
      tagline: "Beat the dealer without going over 21",
    },
    chinchiro: {
      label: "Chinchiro",
      tagline: "Three dice in a bowl — Japanese-style dice gambling",
    },
  },
  tables: {
    bj: {
      low: "Blackjack — Low Limit",
      mid: "Blackjack — Mid Stakes",
      high: "Blackjack — High Roller",
    },
    cc: {
      low: "Chinchiro — Low Limit",
      mid: "Chinchiro — Mid Stakes",
      high: "Chinchiro — High Roller",
    },
  },
  stats: {
    title: "Career Stats",
    handsPlayed: "Hands Played",
    winRate: "Win Rate",
    totalWagered: "Total Wagered",
    totalWon: "Total Won",
    biggestWin: "Biggest Win",
    netProfit: "Net Profit",
    noData: "No games played yet",
    bestStreak: "Best Streak",
  },
  leaderboard: {
    title: "Leaderboard",
    coins: "Coins",
    wins: "Wins",
    rank: "Rank",
    you: "(you)",
    myRank: "Your rank: #{rank}",
    unranked: "Unranked",
  },
  dailyStreak: {
    title: "Login Streak",
    day: "Day {n}",
    reward: "+{amount}",
    today: "Today",
    claimed: "Claimed",
    next: "Tomorrow: +{amount}",
  },
  achievements: {
    title: "Achievements",
    unlocked: "Unlocked",
    locked: "Locked",
    progress: "{progress} / {threshold}",
    first_win: "First Win",
    wins_10: "10 Wins",
    wins_50: "50 Wins",
    wins_100: "100 Wins",
    wins_500: "500 Wins",
    hands_100: "100 Hands",
    hands_500: "500 Hands",
    hands_1000: "1000 Hands",
    wagered_10k: "Wagered 10K",
    wagered_100k: "Wagered 100K",
    bj_first_win: "BJ First Win",
    bj_wins_25: "BJ 25 Wins",
    bj_wins_100: "BJ 100 Wins",
    bj_veteran: "BJ Veteran",
    cc_first_win: "Chinchiro First Win",
    cc_wins_25: "Chinchiro 25 Wins",
    cc_wins_100: "Chinchiro 100 Wins",
    cc_veteran: "Chinchiro Veteran",
    streak_3: "3-Win Streak",
    streak_5: "5-Win Streak",
    streak_10: "10-Win Streak",
    big_win_500: "Big Win 500+",
    big_win_1000: "Big Win 1000+",
    big_win_5000: "Big Win 5000+",
    coins_5k: "Hold 5K Coins",
    coins_10k: "Hold 10K Coins",
    coins_50k: "Hold 50K Coins",
    toast: "Achievement Unlocked!",
  },
  challenges: {
    title: "Daily Challenges",
    claim: "Claim",
    play_5: "Play 5 Hands",
    play_10: "Play 10 Hands",
    win_1: "Win 1 Game",
    win_3: "Win 3 Games",
    win_5: "Win 5 Games",
    bj_play_5: "Play 5 BJ Hands",
    bj_win_3: "Win 3 BJ Games",
    cc_play_5: "Play 5 Chinchiro",
    cc_win_3: "Win 3 Chinchiro",
    wager_500: "Wager 500 Total",
    wager_1000: "Wager 1000 Total",
    wager_2000: "Wager 2000 Total",
  },
  xp: {
    levelUp: "Level Up!",
    level: "Lv.{n}",
  },
  streak: {
    count: "{n} streak",
    tooltip: "On a {n}-win streak",
    tierUp: "TIER UP!",
    tier3Reached: "🔥 STREAK MAX!!",
  },
  tableHeat: {
    hot: "Hot Table",
    ultraHot: "🔥 Ultra Hot!",
    jackpots: "{n} jackpots",
  },
  ads: {
    watchToDouble: "Watch ad for 2x",
    watchForMore: "Watch ad for 1000 coins",
    watchForCoins: "Watch Ad for Coins",
    remaining: "{n} left",
    watching: "Watching ad...",
    complete: "Claim reward",
    dailyCap: "Daily ad limit reached",
    interstitial: "Returning to game shortly...",
    skip: "Skip",
  },
  shop: {
    title: "Shop",
    buy: "Buy",
    equip: "Equip",
    equipped: "Equipped",
    owned: "Owned",
    notEnoughCoins: "Not enough coins",
    purchaseSuccess: "Purchased!",
    categories: {
      card_skin: "Cards",
      dice_skin: "Dice",
      table_theme: "Table",
    },
    items: {
      card_midnight: "Midnight",
      card_royal: "Royal",
      card_sakura: "Sakura",
      dice_jade: "Jade",
      dice_obsidian: "Obsidian",
      dice_golden: "Golden",
      table_crimson: "Crimson",
      table_midnight: "Midnight",
      table_royal: "Royal",
      card_champion: "Champion",
      dice_streak: "Streak",
      table_veteran: "Veteran",
    },
    achievementLock: "Unlock with: {name}",
  },
  header: {
    lang: "Language",
    mute: "Mute",
    unmute: "Unmute",
    bgmOn: "BGM on",
    bgmOff: "BGM off",
    coinsLabel: "Coin balance",
    xpLabel: "XP: {xp}",
  },
  info: {
    common: {
      back: "← Back to home",
      lastUpdated: "Last updated: {date}",
      siteName: "SatoriCasino",
      footerHeading: "Related pages",
    },
    nav: {
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      about: "About",
      responsible: "Responsible Gaming",
    },
    privacy: {
      title: "Privacy Policy",
      intro:
        "SatoriCasino (\"the Service\") respects your personal information and privacy and is committed to protecting it. This policy describes what information we collect through the Service, how we use it, when we share it with third parties, how long we retain it, and what rights you have as a user. The Service only deals in virtual coins and offers no real-money payment functionality. Account registration requires only a display name and a passphrase; we do not ask for any contact information such as email address or phone number.",
      sections: {
        collection: {
          title: "Information We Collect",
          body:
            "The Service collects only the minimum information needed for its operation. Specifically, this includes the display name you provide at registration, the JWT token issued for authentication, and your game state (bet history, wins and losses, coin balance, unlocked achievements, daily challenge progress, owned and equipped cosmetics, level and experience points, last login time, and login streak length).\n\nIn addition, the server temporarily retains access logs (IP address, user agent, request timestamp, endpoint accessed) for the purpose of service improvement and incident analysis. These logs are not used to personally identify users.\n\nThe Service does not collect your real name, postal address, date of birth, phone number, email address, or payment information such as credit card or bank account numbers. Your display name is visible to other users, so please avoid including your real name or other personally identifying information. Only your display name, total wins, and coin balance appear on the leaderboard; no other information is published.\n\nThe Service uses cookies and similar technologies (localStorage, sessionStorage) to preserve your authentication token, remember your language choice, remember your mute and BGM settings, and persist UI state.",
        },
        cookies: {
          title: "Cookies and Advertising",
          body:
            "We use cookies for both service operation and third-party advertising delivery.\n\nFirst-party cookies (those set directly by the Service) are used solely to provide service functionality: maintaining your authentication session, remembering your language selection, and storing audio preferences. These are stored in your browser and can be deleted at any time through your browser settings.\n\nAs a third-party cookie, the Service uses Google AdSense. Google and its partner companies may use cookies to serve advertisements based on your past visits to the Service and other websites. You can disable personalized ads through your Google account ad settings (https://adssettings.google.com/).\n\nUsers accessing the Service from the European Economic Area (EEA), the United Kingdom, or Switzerland will see a Google-certified Consent Management Platform (CMP) that lets them choose whether to consent to cookie storage, personalized advertising, ad measurement, and content measurement. If you decline, only non-personalized ads will be shown.\n\nIf you disable cookies entirely in your browser, you will be unable to maintain an authentication session and may be unable to log in to the Service.",
        },
        thirdParty: {
          title: "Third-Party Services",
          body:
            "The Service uses the following third-party services to provide and operate its features.\n\n[Google Firebase (Authentication, Firestore, Hosting)] We use Firestore to store account information, game state, and settings. Firebase is a cloud service provided by Google LLC; data is encrypted and stored on Google servers (primarily in the Asia-Pacific region). For details, see the Google Privacy Policy at https://policies.google.com/privacy.\n\n[Google Cloud Run] We use Cloud Run as the execution environment for the backend API. Request processing logs are retained for Google Cloud's standard period (typically 30 days).\n\n[Google AdSense / Funding Choices] We use these for advertising delivery and for managing user consent. Ad-related cookies and similar identifiers enable Google and partner companies to personalize ads and measure their effectiveness.\n\nThe Service does not sell, lend, or transfer your personal information to any third party other than those listed above. We may, however, disclose information to the extent required to comply with a lawful disclosure request (such as a court order) or to protect the life, body, or property of the user or a third party.",
        },
        retention: {
          title: "Data Retention and Deletion",
          body:
            "Information we collect is retained according to the following policy.\n\n[Account Information] Retained indefinitely for as long as you continue to use the account. The Service may delete accounts that have not logged in for more than 365 days, without prior notice, at the operator's discretion.\n\n[Access Logs] Server access logs are automatically deleted within 90 days as a rule. Longer retention may apply only when required for incident analysis or investigation of unauthorized access.\n\n[Advertising Cookies] Retained according to each cookie's expiration period. In most cases, this ranges from 30 days to a maximum of about 2 years. See Google's privacy policy for details.\n\n[Deletion Requests] You have the right to request the deletion of your account and associated data. To do so, please contact the Service operator. Note that due to technical constraints, complete removal from backups may take up to 30 days after deletion.\n\nDisplay names and statistics shown on the leaderboard are excluded after account deletion, but cached aggregate values may persist briefly.",
        },
        contact: {
          title: "Contact",
          body:
            "For questions about this policy, concerns about how we handle personal information, or requests for data deletion, please contact the Service operator.\n\nThe Service is operated as a hobby project and does not maintain a dedicated support desk. Please reach out via the GitHub repository's Issues feature or through the operator's public contact channels. We will respond as quickly as we can, but a reply may take some time.\n\n[Changes to This Policy] We may revise this Privacy Policy in response to changes in law, service content, or operational needs. The revised policy takes effect when it is posted on this page. For significant changes, we will provide separate notice within the Service.\n\n[Governing Law] This policy is interpreted and applied under the laws of Japan.",
        },
      },
    },
    terms: {
      title: "Terms of Service",
      intro:
        "These Terms of Service (\"the Terms\") set out the conditions for using SatoriCasino (\"the Service\"). Users of the Service (\"the User\") are deemed to have agreed to these Terms. The Service is a hobby project for entertainment purposes that deals only in virtual coins; it provides no real-money gambling, conversion, withdrawal, or related functionality whatsoever.",
      sections: {
        eligibility: {
          title: "Eligibility",
          body:
            "The Service is available to anyone able to comply with Japanese law and the laws of the User's place of residence, regardless of age. However, because the Service offers gambling-style games (blackjack, chinchiro, etc.), we strongly recommend that users under 18 use it only with the judgment and consent of a guardian.\n\nUsers are responsible for safeguarding the display name and passphrase they provide when registering. If the correct combination of display name and passphrase is entered, the Service treats the access as legitimate. If you suspect unauthorized access by a third party, please change your passphrase promptly.\n\nCreating multiple accounts as a single user is generally discouraged. If the operator determines that multiple accounts undermine the fairness of features such as achievements, daily challenges, or the leaderboard, the operator may consolidate or delete those accounts.",
        },
        virtualCoins: {
          title: "Nature of Virtual Coins",
          body:
            "The \"coins\" used inside the Service are virtual numerical values usable solely for enjoying games within the Service. They have the following characteristics.\n\nFirst, coins are not legal tender. They are not exchanged for cash, electronic money, cryptocurrency, or any other monetary value. Buying, selling, transferring, gifting, or exchanging coins is not permitted in any form, whether inside or outside the Service.\n\nSecond, coins are obtained free of charge. Initial coins are granted at registration, and additional coins can be earned through daily bonuses, daily challenge rewards, winning games, watching reward ads, and similar activities. No real-money payment is ever required to obtain coins.\n\nThird, if you run out of coins, our free bailout feature grants 500 coins. Bailout is available once per day and can be upgraded to 1000 coins by watching an ad.\n\nFourth, if your coins are lost for any reason — including service termination, account deletion, or otherwise — the Service offers no monetary or other compensation.",
        },
        prohibitedConduct: {
          title: "Prohibited Conduct",
          body:
            "When using the Service, the User must not engage in any of the following.\n\n(1) Conduct that violates laws, public order and morals, or is related to criminal activity.\n\n(2) Conduct that interferes with the operation of the Service, places excessive load on the server, or accesses the Service via automated tools (bots, scripts, etc.).\n\n(3) Reverse-engineering the Service, decompiling source code, or attempting unauthorized access.\n\n(4) Impersonating other users, defaming other users, or using offensive, discriminatory, sexually explicit, or violent display names.\n\n(5) Buying, selling, or exchanging coins, conducting coin transactions on external services, or encouraging such activity.\n\n(6) Using improper means to acquire coins (exploiting bugs, colluding across multiple accounts, automated input, etc.).\n\n(7) Disclosing other users' information obtained through the Service to third parties without that user's consent.\n\n(8) Any other conduct contrary to the purpose of the Service, or that the operator considers inappropriate.\n\nThe Service may take measures including warnings, coin forfeiture, temporary or permanent account suspension, and other necessary actions against users who violate these prohibitions.",
        },
        accountTermination: {
          title: "Account Termination",
          body:
            "Users may stop using the Service at any time and request the deletion of their account. Account deletion requests can be made through the contact form or, once implemented, through the Service's settings screen.\n\nThe Service may terminate, suspend, or restrict an account without prior notice in the following cases.\n\n(1) The User has violated these Terms.\n\n(2) The account has not logged in for more than 365 days and the operator considers it inactive.\n\n(3) Termination is required by law or by a request from a court or other public authority.\n\n(4) The Service is being discontinued.\n\nUpon account termination, all coins, achievements, cosmetics, and other information associated with that account are lost. The Service provides no compensation to the User for such loss.",
        },
        disclaimer: {
          title: "Disclaimer",
          body:
            "The Service is provided \"as is.\" The Service makes no warranty, express or implied, regarding fitness for a particular purpose, merchantability, non-infringement of third-party rights, or any other matter.\n\nThe Service is operated free of charge as a hobby project and does not guarantee its continuity, availability, the completeness of data, or the accuracy of displayed information. The Service may be interrupted, modified, or discontinued without prior notice at the operator's convenience.\n\nGame outcomes (wins, losses, payouts, jackpot frequencies, etc.) are determined according to the probability distribution intended by the operator, but technical defects or unexpected bugs may produce results that differ from intent. The Service bears no responsibility whatsoever for any damages arising therefrom (changes in coin balance, gain or loss of achievements or cosmetics, emotional disadvantage, etc.).\n\nAds shown within the Service are delivered by third parties (Google AdSense and its partners). The Service bears no responsibility for the contents of ads, the services or products of advertisers, or any disputes arising from transactions with advertisers.",
        },
        liability: {
          title: "Limitation of Liability",
          body:
            "The Service bears no responsibility for any damages incurred by users in connection with use of the Service (including but not limited to direct damages, indirect damages, special damages, incidental damages, consequential damages, lost profits, and loss of data).\n\nThis limitation does not apply to damages caused by the operator's intentional misconduct or gross negligence. Even in such cases, the Service's liability is capped at the amount the User has directly paid to the Service (typically zero, since the Service is free).\n\nUsers use the Service at their own risk. If the User causes damage to a third party through use of the Service, the User must resolve it at their own cost and responsibility, and may not cause damage to the Service.",
        },
        changes: {
          title: "Changes to These Terms and Governing Law",
          body:
            "We may revise these Terms in response to changes in law, service content, or operational needs. The revised Terms take effect when posted on this page. For significant changes, we will provide separate notice within the Service.\n\nIf you continue to use the Service after a revision, you are deemed to have agreed to the revised Terms. If you do not agree to the revised Terms, please stop using the Service.\n\nThese Terms are interpreted and applied under the laws of Japan. If a dispute arises in connection with the Service, the Tokyo District Court shall have exclusive jurisdiction of first instance.",
        },
      },
    },
    about: {
      title: "About SatoriCasino",
      intro:
        "SatoriCasino is a virtual-coin-only collection of casino games built around the concept of \"a pocket Monaco wearing the friendliness of a Japanese tavern.\" Combining the formality of a real casino with the warmth of traditional Japanese dice gambling (chinchiro), it currently offers two games: blackjack and chinchiro. Open it alone late at night, or invite someone to spectate — we aim for a place where tension and laughter coexist.",
      sections: {
        mission: {
          title: "Mission and Brand",
          body:
            "SatoriCasino aims to deliver excitement and tension comparable to a real casino while holding firm to its virtual-coin-only policy. With the brand statement \"a pocket Monaco wearing the friendliness of a Japanese tavern,\" we design around four core values.\n\n[Festive] To ensure you never miss \"what is happening right now,\" jackpot moments combine screen shake, rim glow, and count-up SFX to make the moment land.\n\n[Refined] To keep things from looking cheap or garish, the foundation is Cinzel display typography, deep felt-green surfaces, and restrained gold accents.\n\n[Honest] We avoid deceiving players. Probabilities and payouts are disclosed up front, copy is respectful, and near-misses are shown honestly.\n\n[Inclusive] To avoid excluding beginners, non-Japanese speakers, mobile users, or spectators, the Service ships i18n (Japanese/English), a spectate mode, touch-friendly alternatives, and reduced-motion support as standard.\n\nWhen these four values come into conflict, we prioritize Honest above all. \"Excitement around betting\" must never be confused with \"luring through deception\" — that is our guiding principle.",
        },
        howToPlay: {
          title: "How to Play",
          body:
            "To join the Service you must either register a new account or log in to an existing one. New registration requires a display name of your choice and the passphrase set by the operator. Once registered, initial coins are granted and you can select a game from the lobby.\n\nIn the lobby, you first pick the game you want to play (blackjack or chinchiro). Then choose a table from that game's list, selecting one whose minimum bet matches your coin balance (Low Limit, Mid Stakes, High Roller). Each table has a maximum number of seats; when a table is full you can still join in spectate mode.\n\nJoining a game requires coins equal to or greater than the table's minimum bet. If you run low, you can top up via the daily bonus (once per day, up to 500 coins), daily challenges (three per day, each granting reward coins), or the emergency bailout (when your coins reach zero: 500 free, or 1000 with an ad).\n\nDuring play, the main actions (Hit, Stand, Roll Dice, etc.) are pinned to the bottom of the screen. Keyboard shortcuts are also provided; the hint bar at the bottom of the screen shows which keys are currently active.",
        },
        blackjack: {
          title: "Blackjack Rules",
          body:
            "Blackjack is the classic card game where you face the dealer and try to bring your hand total as close to 21 as possible without exceeding it. The Service uses a Vegas Strip-style baseline with the following specifics.\n\n[Card Values] Number cards (2-10) count at face value. Face cards (J, Q, K) all count as 10. An Ace counts as either 1 or 11 — whichever is more favorable to the player is chosen automatically.\n\n[Flow] After bets are placed, the dealer and the player each receive two cards. The dealer's first card is face up; the second is hidden. The player may choose to Hit (draw one card), Stand (stop drawing), or Double (double the bet and draw exactly one card). Exceeding 21 is an instant Bust and a loss.\n\n[Dealer Rules] After all players' turns, the dealer reveals the hidden card and automatically hits until the hand total is at least 17 (hits on soft 17).\n\n[Payouts] A regular win pays 1:1 (you receive a payout equal to your bet). A two-card 21 (\"Blackjack\") pays 1.5:1. A push returns the bet. A bust or loss to the dealer forfeits the bet.\n\n[Double Down] After seeing your first two cards, you may double your bet and draw exactly one more card. Your coin balance must be at least equal to the bet.",
        },
        chinchiro: {
          title: "Chinchiro Rules",
          body:
            "Chinchiro is a traditional Japanese gambling game in which three dice are rolled into a bowl and the resulting combination determines the winner. In the Service, one player acts as the banker and the others as players (children).\n\n[Flow] Once the banker is decided, the children place bets. Each child must bet at least the table minimum but no more than one-fifth of their coin balance (because the banker may have to pay up to 5x). After bets are placed, the banker rolls the dice up to three times to set their hand. Then each child does the same, with up to three rolls.\n\n[Hands and Payouts]\n\nPinzoro (1-1-1): The highest hand. Pays 5x.\n\nArashi (any triple from 2-2-2 to 6-6-6): Pays 3x.\n\nShigoro (4-5-6): Pays 2x.\n\nNormal hand (two matching dice and one \"eye\"): The remaining die's number becomes your hand value. Example: 5-5-3 is \"eye of 3.\" Eye-vs-eye duels are won by the higher number; the winner takes a normal payout. If the banker wins with a higher eye, the payout doubles.\n\nHifumi (1-2-3): The lowest hand. Pays -3x (loss).\n\nMenashi (no two matching dice; no qualifying hand): If you don't get a hand after three rolls, you lose.\n\nWakare (banker and child tie): The bet is returned.\n\nBecause the banker may have to pay all children on a pinzoro or arashi, you must have at least five times your bet in coins to play the banker role.",
        },
        features: {
          title: "Feature Overview",
          body:
            "Beyond the core games, the Service offers the following features.\n\n[Achievements] 27 achievements are defined, automatically unlocked when you meet conditions such as a specific number of wins, cumulative hands played, win streaks, or total wagered. Each unlock grants experience points (XP).\n\n[Daily Challenges] Three challenges are presented daily (e.g., play 5 hands, win 3 times, bet 500 coins). Completing them and claiming the reward grants additional coins. Challenges are deterministically selected per user and reset at midnight.\n\n[Login Streak] The daily bonus amount scales with consecutive login days (Day 1: 100 → Day 7: 500 coins). The cycle resets after seven days.\n\n[Leaderboard] Displays the top 10 users across all players, ranked by either coin balance or total wins. Your own rank is shown alongside.\n\n[XP and Levels] You earn 10 XP per round, 15 XP per win, and 30 XP for jackpot-class outcomes. Levels rise with XP, and level-ups are signaled with dedicated visuals and notifications.\n\n[Cosmetics Shop] Nine cosmetic items can be purchased with in-game coins, across three categories: card backs, dice materials, and table themes. Card and dice skins are visible to other players at your table, while table themes apply only to your own screen.\n\n[Reactions] Inside a table, six preset reactions can be sent (GG, Nice, Wow, Ouch, LOL, GL), with a 3-second cooldown.\n\n[Spectate Mode] When a table already has players, the \"Watch\" button lets you join without betting or playing — you simply watch the game progress and may send reactions.",
        },
      },
    },
    responsible: {
      title: "Responsible Gaming",
      intro:
        "As an entertainment-oriented hobby project, SatoriCasino respects the mental and physical health of its users and is designed with care to help prevent gambling addiction. This page describes the Service's commitments to responsible gaming and outlines what we ask of our users.",
      sections: {
        noRealMoney: {
          title: "No Real-Money Handling",
          body:
            "The Service never exchanges coins for cash, electronic money, cryptocurrency, or any other monetary value. This is a foundational policy of the Service and there are no plans to change it.\n\nCoins are obtained free of charge — through the initial grant at registration, daily bonuses, daily challenges, winning games, and watching ads. No real-money payment is ever required to obtain coins.\n\nThe Service intentionally avoids any language framing coins as \"payment,\" \"investment,\" or \"assets.\" Leaderboard rankings are based on gameplay results such as wins and coin holdings — not on real-world financial success.\n\nConduct aimed at gaining coins improperly (multi-account collusion, automated tools, bug exploitation, etc.) is prohibited. Such conduct undermines fairness and ultimately worsens the experience for every user.",
        },
        bailout: {
          title: "Help When Coins Run Out",
          body:
            "If your coins are completely depleted, the Service offers a free bailout that grants 500 coins. You can increase the bailout to 1000 coins by watching a short ad in the lobby.\n\nBailout is available once per day. The Service never asks you to purchase coins. There is no display or prompt that says \"buy more coins\" or \"top up to recover.\"\n\nThis system is designed so that running out of coins is a natural cue to take a break — to stop for the day, or to come back another time. Put differently: you do not need to keep playing until you've spent every coin every day. Trying to chase losses is far worse for you in the long run than spending that time on something else.",
        },
        timeAwareness: {
          title: "Being Mindful of Time",
          body:
            "The Service deliberately avoids mechanisms that drive continuous play.\n\n[Three Daily Challenges, Fixed] Only three challenges appear per day. There is no penalty for not completing them, and no \"only N more battles for your reward\" pressure.\n\n[No Reminder Notifications] We do not send push notifications such as \"your streak is about to break\" when a win streak is about to end. Whether to play is left entirely to you.\n\n[No FOMO Limited-Time Events] We never run timed pressure events like \"item disappears in 24 hours\" or \"limited-time campaign.\" Daily challenge resets simply happen, quietly.\n\n[One-Tap Exit] Leaving a table and logging out involve minimal friction — no confirmation modals, no attempts to keep you in.\n\nWhile playing the Service, if you notice that \"a lot of time has passed without you realizing,\" \"you can't focus on other things,\" or \"you feel you must continue to recoup losses,\" we recommend closing the browser and taking a break. The Service will still be here whenever you choose to return.",
        },
        ageRequirement: {
          title: "Age Considerations",
          body:
            "The Service does not set a strict age limit, but because it features gambling-style games (blackjack, chinchiro, and other strongly chance-based games), we strongly recommend that minors under 18 use the Service only with the judgment and consent of a guardian.\n\nThe Service does not handle real money and offers no mechanism to purchase coins. Even so, the game structure itself depends on chance-based outcomes, and repeated exposure to such experiences at a young age has been linked to potential future gambling tendencies.\n\nFor guardians: if a minor uses the Service, we recommend setting household rules about playtime, frequency, and balance with other online activities. The Service has no built-in parental controls, so management depends on agreements reached within the household.",
        },
        problemGambling: {
          title: "Awareness of Problem Gambling and Where to Get Help",
          body:
            "Because the Service does not handle real money, there is no risk of gambling addiction caused by financial loss. However, becoming overly immersed in the game's randomness, having strong emotional reactions to outcomes, or prioritizing the game over real-world responsibilities can all be signs of psychological dependency.\n\nIf any of the following resonate with you, please consider pausing your use of the Service and, if needed, consulting a specialized support organization.\n\n- You feel restless or irritated when you aren't playing the Service.\n\n- You feel an urge to recover losses and end up playing for far longer than intended.\n\n- You prioritize the Service over work, study, or family responsibilities.\n\n- You hide your playtime from those around you, or you lie about it.\n\n- You have similar tendencies with real-money gambling outside the Service.\n\n[Major Support Resources in Japan]\n\n- Gambling Addiction Consultation Desks (Ministry of Health, Labour and Welfare): Available at mental health and welfare centers and public health centers nationwide. Contact details for your municipality can be found on the MHLW website (https://www.mhlw.go.jp/).\n\n- Society Concerned about the Gambling Addiction Problem (SCGA): https://scga.jp/\n\n- Gambling Addiction Network (NPO): Provides consultation and support for those affected and their families.\n\nIf you or someone close to you is feeling concerned, please reach out to a specialized organization early. Consultations are free and anonymous.",
        },
      },
    },
  },
};
