import type { Translation } from "./ja";

export const en: Translation = {
  common: {
    connecting: "Connecting…",
    loading: "Loading…",
    connected: "Connected",
    reconnecting: "Reconnecting…",
    backToLobby: "← Lobby",
    log: "Log",
    startGame: "Start Game",
    newRound: "New Round",
    close: "Close",
    cancel: "Cancel",
    collect: "Collect",
    failed: "Something went wrong",
    coinsAmount: "{n} coins",
    seconds: "{n}s",
    turnTimer: "{n}s left",
  },
  help: {
    button: "How to play",
  },
  connection: {
    lostTitle: "Connection lost",
    lostMsg: "We couldn't reconnect to the server. Try reconnecting, or head back to the lobby.",
    reconnect: "Reconnect",
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
    tagline: "Virtual-Coin Casino Lounge",
    login: "Login",
    register: "Register",
    enterLounge: "Enter Lounge",
    createAccount: "Create Account",
    displayName: "Display Name",
    passphrase: "Passphrase",
    landing: {
      subheading: "Free blackjack & chinchiro, played with virtual coins",
      intro:
        "SatoriCasino is a virtual-coin-only collection of casino games that never uses real money. Enjoy proper blackjack and the traditional Japanese dice game chinchiro, free, any time. No cash-out, no purchases.",
      feature1Title: "No Real Money",
      feature1Body:
        "Every coin is free. Initial grant, daily bonus, challenges, and bailout keep you playing as long as you like.",
      feature2Title: "Two Games",
      feature2Body:
        "Blackjack, where you race to 21, and chinchiro, decided by three dice. Pick whichever fits your mood.",
      feature3Title: "Things to Chase",
      feature3Body:
        "Achievements, levels, win streaks, leaderboards, and cosmetics. The more you play, the deeper it gets.",
      learnMore: "Learn more:",
      disclaimer:
        "For ages 18+. A free, entertainment-only game — no real money, no cash-out, no purchases, and no prizes of real-world value.",
    },
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
    near_miss: "LOSS",
    pinzoro: "PINZORO!!",
    arashi: "ARASHI!",
    shigoro: "SHIGORO!",
    hifumi: "HIFUMI…",
    menashi: "NO HAND",
    wakare: "WAKARE",
    nearMissDetail: {
      byOne: "Lost by 1 point",
      byPoint: "Lost by {n} points",
      busted22: "Busted at 22 (1 over)",
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
    dealerValueLabel: "Dealer total {n}",
    handValueLabel: "Hand total {n}",
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
    noTables: "No open tables for this game right now.",
    watch: "Watch",
    chooseGame: "Choose Your Game",
    tablesOpen: "{n} tables open",
    seats: "{n}/{max} seats",
    minBet: "Min {n}",
    join: "Join",
    full: "Full",
    dailyBonus: "Daily Bonus",
    bailout: "Coin Top-up",
    bailoutTitle: "Coin Top-up",
    bailoutMsg: "Free coins added. Take your time and enjoy.",
    logout: "Logout",
    guide: {
      pickGame: "Pick a game to see the tables you can join.",
      pickTable: "Tap a table to take a seat — anyone can join an open one.",
    },
    onboarding: {
      title: "Welcome!",
      text: "Coins are free. Pick a game, take a seat, and play a hand. Come back daily to claim your bonus coins.",
    },
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
  seo: {
    titles: {
      home: "SatoriCasino — Virtual-Coin Blackjack & Chinchiro",
      lobby: "Lobby | SatoriCasino",
      game: "Playing | SatoriCasino",
      about: "About SatoriCasino",
      privacy: "Privacy Policy | SatoriCasino",
      terms: "Terms of Service | SatoriCasino",
      responsible: "Responsible Gaming | SatoriCasino",
      blackjackGuide: "How to Play Blackjack & Basic Strategy | SatoriCasino",
      chinchiroGuide: "How to Play Chinchiro — Hands & Payouts | SatoriCasino",
      faq: "Frequently Asked Questions | SatoriCasino",
      gettingStarted: "Getting Started — Player Guide | SatoriCasino",
      glossary: "Casino Glossary | SatoriCasino",
      contact: "Contact | SatoriCasino",
    },
    descriptions: {
      home: "SatoriCasino is a free, virtual-coin-only collection of casino games. Play blackjack and chinchiro with no real money. Full guides, basic strategy, and FAQ included.",
      lobby: "The SatoriCasino lobby. Choose a blackjack or chinchiro table and start playing.",
      game: "Now playing at SatoriCasino.",
      about: "Learn about SatoriCasino's mission, brand, how to play, the rules of blackjack and chinchiro, and its features.",
      privacy: "SatoriCasino's privacy policy: what information we collect, cookies and advertising, third-party services, and data retention and deletion.",
      terms: "SatoriCasino's terms of service, covering the nature of virtual coins, prohibited conduct, and disclaimers.",
      responsible: "SatoriCasino's commitments to responsible gaming and guidance for enjoying the Service in a healthy way.",
      blackjackGuide: "A beginner-friendly guide to blackjack: the rules, card values, when to hit, stand, or double, payouts, and the basic strategy that improves your odds.",
      chinchiroGuide: "A clear guide to chinchiro: the banker-and-player format, game flow, hands like pinzoro, arashi, and shigoro, payouts, dice odds, and strategy.",
      faq: "Frequently asked questions and answers about SatoriCasino's coins, accounts, bailout, daily challenges, spectate mode, and privacy.",
      gettingStarted: "A beginner's guide to SatoriCasino, walking you step by step from creating an account to joining a game, betting, and earning coins.",
      glossary: "A glossary of blackjack, chinchiro, and general casino terms, plus SatoriCasino's own feature names.",
      contact: "How to contact SatoriCasino with questions, bug reports, or data-deletion requests.",
    },
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
      blackjackGuide: "How to Play Blackjack",
      chinchiroGuide: "How to Play Chinchiro",
      faq: "FAQ",
      gettingStarted: "Getting Started",
      glossary: "Glossary",
      contact: "Contact",
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
    blackjackGuide: {
      title: "The Complete Blackjack Guide",
      intro:
        "Blackjack is the world's most popular casino game: a one-on-one contest against the dealer where you try to bring your hand total close to 21. This guide walks through SatoriCasino's blackjack rules, how cards are counted, when to use each action, the payouts, and the basic strategy that improves your odds — all explained for first-timers. The Service is virtual-coin-only, with no real-money handling whatsoever.",
      sections: {
        overview: {
          title: "What Is Blackjack?",
          body:
            "The goal of blackjack is to get your hand total as close to 21 as possible — without going over — and beat the dealer's hand. Going over 21 is a \"bust,\" and you lose immediately.\n\nYou are always playing against the dealer, not against the other players. Even when several players share a table, each one plays a separate contest against the dealer.\n\nIf your first two cards are an Ace plus a 10-value card (totaling 21), it's called a \"Blackjack\" and pays more than an ordinary win.\n\nBlackjack involves a lot of luck, but it is also one of the few casino games where making mathematically optimal choices, hand after hand, can minimize your long-run losses. The key to that is the basic strategy described below.",
        },
        cardValues: {
          title: "How Cards Are Counted",
          body:
            "In blackjack the suit of a card is irrelevant — only its numerical value matters.\n\nNumber cards (2 through 10) count at their printed value.\n\nThe face cards — J (Jack), Q (Queen), and K (King) — all count as 10.\n\nAn Ace counts as either 1 or 11, whichever is more favorable to the player. SatoriCasino makes this decision automatically. For example, a hand of A and 6 is \"7 or 17,\" interpreted flexibly as the situation requires.\n\nA hand where the Ace can be counted as 11 without busting is called a \"soft hand\"; a hand with no Ace, or where the Ace can only count as 1, is a \"hard hand.\" This distinction matters in basic strategy.",
        },
        gameFlow: {
          title: "How a Round Flows",
          body:
            "1. Bet — First, decide and confirm your bet. Each table has a different minimum bet (Low Limit / Mid Stakes / High Roller).\n\n2. Deal — The player and the dealer each receive two cards. Both of the player's cards are face up; the dealer has one face up (the up card) and one face down (the hole card).\n\n3. Player's turn — Look at your hand and choose Hit, Stand, or Double. Going over 21 is an instant bust and a loss.\n\n4. Dealer's turn — After all players act, the dealer reveals the hole card. SatoriCasino's dealer must keep drawing until the hand total reaches at least 17, and also hits on \"soft 17\" (a 17 that includes an Ace). This rule is slightly unfavorable to the player, but it is the standard used at many real Las Vegas tables.\n\n5. Settlement — The player's and dealer's hands are compared and payouts are decided.",
        },
        actions: {
          title: "The Player's Choices (Actions)",
          body:
            "[Hit] Draw one more card. Choose this when you want to increase your total. If the result exceeds 21, you bust.\n\n[Stand] Draw no more cards and lock in your current hand. Choose this when you already have a high total, or when the bust risk is too high.\n\n[Double Down] Double your bet and, in exchange, draw exactly one more card before standing. Available only right after seeing your first two cards. It's a powerful option for maximizing your payout on strong hands (totals of 9-11, for instance). Your coin balance must be at least equal to the bet.\n\nWhich action is correct is determined mathematically by the combination of your hand and the dealer's up card. The system that codifies this is the basic strategy.",
        },
        payouts: {
          title: "Payouts",
          body:
            "[Regular Win] If you are closer to 21 than the dealer, or the dealer busts, you win an amount equal to your bet (1:1). A 100-coin bet earns 100 coins of profit (200 coins returned to you).\n\n[Blackjack] If your first two cards are an Ace plus a 10-value card for a total of 21, the payout is 1.5:1. A 100-coin bet earns 150 coins. However, if the dealer also has a Blackjack, it's a tie.\n\n[Push (Tie)] If the player's and dealer's totals are equal, your bet is returned and nothing is won or lost.\n\n[Loss / Bust] If you are lower than the dealer, or you exceed 21, you forfeit your bet.\n\nBlackjack's 3:2 payout (1.5x) is larger than a regular 1:1 win, so a Blackjack hits hard and adds up over the long run.",
        },
        basicStrategy: {
          title: "Basic Strategy",
          body:
            "Basic strategy is a set of guidelines that, for each combination of your hand and the dealer's up card, prescribes the action with the highest mathematical expected value. Followed perfectly, it can cut the house edge to under 1%. Here are the essentials.\n\n[Hard Hands (no Ace)] A total of 8 or less: always hit. A total of 9: double when the dealer shows 3-6, otherwise hit. Totals of 10-11: double when the dealer's up card is lower than your total. Totals of 12-16: stand if the dealer shows 2-6 (weak), hit if 7 or higher (strong). Totals of 17 or more: always stand.\n\n[Soft Hands (Ace counts as 11)] With an Ace you rarely bust, so play aggressively. Soft 13-17 (A+2 to A+6): double when the dealer is weak, otherwise hit. Soft 18 (A+7): stand against a dealer 2-8, hit against 9 or higher. Soft 19 or more: stand.\n\n[The Common Rule] When the dealer's up card is 2-6, the dealer is \"weak\" and likely to bust. Don't push your luck — wait for the dealer to self-destruct. When the dealer shows 7-A, they are \"strong,\" so you need to build up your own hand.\n\n[Common Mistakes] Standing on 16 against a dealer 10 out of fear (hitting is correct), mistaking soft 18 for a strong hand and always standing, and failing to double on a winning 11 are all typical errors.",
        },
        oddsAndEdge: {
          title: "Odds and the House Edge",
          body:
            "When you follow basic strategy, blackjack has one of the lowest house edges of any casino game — roughly 0.5% to 1% with proper play. That's a big difference from playing carelessly (generally 2-3% or more).\n\nKnowing the dealer's bust rate by up card helps your decisions. When the dealer shows a 5 or 6, the bust rate is around 40%; it's about 40% on a 4 and around 35% on a 2-3. With 7 or higher it drops to 26% or less. That's exactly why \"wait when the dealer shows 2-6\" is the foundation.\n\nAs for the famous \"card counting,\" that's a technique for brick-and-mortar games that draw from a shoe of multiple decks dealt down over time. It is not effective in most digital versions, including SatoriCasino, where the cards are reshuffled every round. Focusing on the basic strategy in this guide is your best bet.\n\nThe Service is virtual-coin-only. Coins have no cash value and no payment is required. Think of bankroll (coin) management purely as a way to keep the fun going. Even if you run out, there is a free bailout feature.",
        },
        terminology: {
          title: "Mini Glossary",
          body:
            "[Hit] Adding one more card.\n\n[Stand] Locking in your hand without drawing.\n\n[Bust] Going over 21, locking in a loss.\n\n[Push] A tie with the dealer; the bet is returned.\n\n[Soft Hand] A hand where the Ace can count as 11 without busting.\n\n[Hard Hand] A hand with no Ace, or where the Ace can only count as 1.\n\n[Hole Card] The dealer's single face-down card.\n\n[Up Card] The dealer's face-up card; information for your decisions.\n\n[Double Down] Doubling your bet and drawing exactly one card.\n\n[Blackjack (Natural)] 21 on the first two cards; pays 1.5x.",
        },
      },
    },
    chinchiroGuide: {
      title: "The Complete Chinchiro Guide",
      intro:
        "Chinchiro (chinchirorin) is a simple yet deep gambling game from old Japan, in which three dice are rolled into a bowl and the resulting combination (the hand) decides the contest. This guide carefully covers SatoriCasino's chinchiro: the banker-and-player format, the game flow, the list of hands and their strength, payouts, dice odds, and strategy for both roles. The Service is virtual-coin-only, with no real-money handling.",
      sections: {
        overview: {
          title: "What Is Chinchiro? — Banker and Players",
          body:
            "Chinchiro is played between one \"banker\" and one or more \"players\" (children). The banker faces all of the children, and each child plays only against the banker. The children do not play against one another.\n\nThe banker has the advantageous position but also carries large risk. If any child rolls a strong hand, the banker pays that child; conversely, if the banker rolls a strong hand, they collect from everyone. In SatoriCasino, to ensure the banker can pay the maximum payout (5x for pinzoro) to everyone, you need at least five times your bet in coins to bet.\n\nDice are thrown into the bowl, and the roll counts only when all three settle inside it. The combination determines the \"hand,\" and its relative strength decides the outcome and payout.",
        },
        gameFlow: {
          title: "How a Round Flows",
          body:
            "1. Bet — The children decide their wagers. In SatoriCasino a child bets at least the table minimum, but no more than one-fifth of their coin balance — a cap that accounts for the banker possibly paying up to 5x.\n\n2. Banker's roll — The banker rolls first, with up to three rolls; they stop the moment a hand is set. If a hand appears on the first throw, that single roll is final.\n\n3. Children's rolls — Each child then does the same, with up to three rolls, to set their result.\n\n4. Showdown — The banker's and children's hands are compared and payouts are decided. When two equal-value \"eyes\" meet, the higher number wins; an exact tie is a \"wakare\" (draw).\n\nIf three rolls produce no hand at all, it's \"menashi\" (no eye) and a loss for that round.",
        },
        hands: {
          title: "The Hands and Their Strength",
          body:
            "From strongest to weakest, the hands are as follows.\n\n[Pinzoro (1-1-1)] The strongest hand: a triple of ones. Pays 5x.\n\n[Arashi (any triple)] Any of 2-2-2 through 6-6-6 — all three dice the same. Pays 3x. A higher number makes a stronger triple, but the payout is flat.\n\n[Shigoro (4-5-6)] The 4-5-6 straight. Pays 2x.\n\n[Normal hand] Two matching dice with one remaining number, which becomes your \"eye.\" For example, 5-5-3 is an \"eye of 3.\" In eye-versus-eye contests the higher number wins. If a child wins, it pays 1x; if the banker wins with a higher eye, it pays 2x.\n\n[Hifumi (1-2-3)] The weakest hand: the 1-2-3 straight. Pays -3x (a big loss).\n\n[Menashi (no eye)] No matching pair and no qualifying hand. If you fail to form a hand after three rolls, you lose.\n\n[Wakare (draw)] When the banker and child have exactly the same strength (e.g., the same eye value). The bet is returned.",
        },
        oddsAndPayouts: {
          title: "Dice Odds and Payouts",
          body:
            "Three dice produce 216 possible outcomes (6×6×6). The rough probability of each hand on a single roll is as follows.\n\nTriples (every same-number roll, including pinzoro) are 6 outcomes, about 2.8%. Of those, pinzoro is a single outcome — about 0.46%, extremely rare.\n\nShigoro (4-5-6) and hifumi (1-2-3), regardless of order, are 6 outcomes each, about 2.8% apiece.\n\nA normal \"eye\" (exactly two dice matching) occurs in 90 outcomes, about 41.7%. The rest form no hand — \"menashi\" — at about 44% per roll. But because you get up to three rolls, the chance of ending on menashi drops considerably.\n\nPayouts are set to match the risk: pinzoro 5x, arashi 3x, shigoro 2x, a normal eye 1x (a banker win with a higher eye pays 2x), hifumi -3x, and menashi a loss. The rarer the hand, the higher the payout — a clean, intuitive design.",
        },
        bankerStrategy: {
          title: "Banker Strategy",
          body:
            "The banker is favored on payouts, but money management is the key. In SatoriCasino, to cover the worst case of paying pinzoro (5x) to every child, you cannot bet as banker without holding at least five times your bet in coins.\n\nIf the banker's roll lands a strong hand early (shigoro or arashi), the basic move is to stop and lock it in. If only a weak \"eye\" has appeared, you must decide between rolling again for something higher or keeping what you have.\n\nBecause the banker rolls before the children, a locked-in hand pressures them. Showing a strong hand forces the children into risky re-rolls, raising their chance of menashi.\n\nThat said, if the banker rolls hifumi or menashi, they become the one paying everyone — so never forget that the banker holds a high-risk, high-reward position.",
        },
        playerStrategy: {
          title: "Player Strategy",
          body:
            "As a child, managing your bet size matters most. Since the Service caps a bet at one-fifth of your coin balance, you're naturally prevented from over-betting in one go. Betting up to the cap every time to chase losses on a losing streak is best avoided if you want to keep playing for the long haul.\n\nIf the banker has already locked in a strong hand (arashi or shigoro), you must roll aggressively, aiming for an equal or better hand. If the banker stops at a weak \"eye,\" the solid play is to lock in the moment you roll something higher, rather than forcing more re-rolls.\n\nWhen you get an \"eye,\" compare its value with the banker's hand: don't re-roll if you're winning, re-roll if you're losing. Remember you get up to three rolls, and that each additional roll carries menashi risk.",
        },
        terminology: {
          title: "Chinchiro Mini Glossary",
          body:
            "[Banker] The house role that faces all children; rolls first.\n\n[Child (Player)] The side challenging the banker.\n\n[Triple] All three dice the same.\n\n[Pinzoro] A triple of ones (1-1-1). The strongest.\n\n[Arashi] The collective name for triples of 2 through 6.\n\n[Shigoro] The 4-5-6 sequence.\n\n[Hifumi] The 1-2-3 sequence. The weakest.\n\n[Eye] The remaining number when two dice match.\n\n[Menashi] A state forming no hand at all.\n\n[Wakare] A draw of equal strength between banker and child; the bet is returned.",
        },
      },
    },
    faq: {
      title: "Frequently Asked Questions (FAQ)",
      intro:
        "We've gathered the questions users ask most often about SatoriCasino. Most questions about accounts, coins, game features, and privacy can be answered here. For anything not covered, please contact the operator.",
      sections: {
        isItRealMoney: {
          title: "Is this a game where I bet real money?",
          body:
            "No. SatoriCasino is an entertainment-oriented service that deals only in virtual coins. Coins cannot be exchanged for cash, electronic money, cryptocurrency, or any other monetary value. There is no mechanism to purchase coins, no point where you pay real money, and no cash-out or withdrawal. It exists purely for the enjoyment of the games.",
        },
        howToGetCoins: {
          title: "How do I get coins?",
          body:
            "All coins are obtained free of charge. You receive an initial grant at registration, plus more from the daily bonus (up to 500 coins), daily challenge rewards, winning games, and watching reward ads. Even if your coins run out completely, the free bailout feature grants 500 coins (or 1000 with an ad).",
        },
        whatIsBailout: {
          title: "What happens if my coins hit zero? (Bailout)",
          body:
            "When your coins are fully depleted, you can use the free \"emergency bailout,\" which grants coins at no cost. The base amount is 500 coins, increasable to 1000 by watching a short ad in the lobby. Bailout is available once per day. The Service never asks you to purchase coins.",
        },
        dailyChallenges: {
          title: "What are daily challenges?",
          body:
            "Three challenges are presented each day (for example: play 5 hands, win 3 times, bet a total of 500 coins). Completing them and claiming the reward grants extra coins. Challenges are deterministically chosen per user and reset at midnight. Completing them is optional, and there is no penalty for not doing so.",
        },
        streaksAndXp: {
          title: "What do win streaks and levels mean?",
          body:
            "A win streak increases each time you win and resets when you lose (ties leave it unchanged). The visual tier rises at 3, 5, and 10 wins. Your level rises with experience points (XP): 10 XP per round, 15 XP per win, 30 XP for a jackpot-class result, and 50 XP per achievement unlocked. Both are simply proof of play and have no cash value.",
        },
        cosmetics: {
          title: "What are cosmetics (skins) for?",
          body:
            "Cosmetics are decorative items you can buy with in-game coins. There are nine in total across three categories: card-back designs, dice materials, and table themes. Card and dice skins are visible to other players at your table, while table themes apply only to your own screen. They are purely for visual enjoyment and have no effect on gameplay advantage.",
        },
        spectateMode: {
          title: "Can I just watch others play? (Spectate)",
          body:
            "Yes. At a table that already has players, you can join in spectate mode via the \"Watch\" button in the lobby. While spectating you cannot bet or play, but you can watch the game unfold in real time and send reactions. It's also handy for peeking at a full table.",
        },
        leaderboard: {
          title: "How is the leaderboard decided?",
          body:
            "The leaderboard shows the top 10 users across all players, ranked by either coin balance or total wins. Your own rank is shown as well. Only the display name and the relevant metric appear; no other personal information is published. It is purely an in-game record, unrelated to real-world financial success.",
        },
        languageSupport: {
          title: "Are languages other than Japanese supported?",
          body:
            "Yes. SatoriCasino supports Japanese and English. You can switch at any time with the language toggle in the header, and your choice is remembered in the browser. On your first visit, the language is auto-selected based on your browser settings.",
        },
        accountAndPassphrase: {
          title: "What do I need to register? What is the passphrase?",
          body:
            "All you need to register is a display name of your choice and a \"passphrase.\" No email address or phone number is required. The passphrase is a shared word that gates access to the Service, set by the operator. Since your display name is visible to other users, please don't include your real name or other personally identifying information.",
        },
        dataDeletion: {
          title: "Can I have my data deleted?",
          body:
            "Yes. You have the right to request deletion of your account and associated data. To do so, please contact the operator. Due to technical constraints, complete removal from backups may take up to 30 days. See the Privacy Policy for details.",
        },
        whoRunsIt: {
          title: "Who runs this? What are the ads for?",
          body:
            "SatoriCasino is operated free of charge as an individual's hobby project. The ads shown (Google AdSense) help cover operating costs such as server fees. By design, ads are not shown on the login screen, info pages, or during content-loading states, out of care for the play experience.",
        },
      },
    },
    gettingStarted: {
      title: "Getting Started",
      intro:
        "For those playing SatoriCasino for the first time, this page explains the flow step by step — from creating an account to joining a game and earning coins. A few minutes is all you need to start your first game. The Service is virtual-coin-only and never requires real money.",
      sections: {
        createAccount: {
          title: "1. Create an Account",
          body:
            "On the top screen, choose \"Register,\" then enter a display name of your choice and the passphrase given to you by the operator. No email address or phone number is needed. Once registration completes, initial coins are granted automatically. Next time, you can log in with the same display name and passphrase. Since your display name is visible to other players, avoid your real name.",
        },
        chooseGame: {
          title: "2. Choose a Game",
          body:
            "After logging in, the lobby appears. First, pick the game you want to play. There are currently two: blackjack (a card game where you aim for 21) and chinchiro (a Japanese dice game decided by three dice). Detailed how-to-play instructions for each are in the How to Play Blackjack and How to Play Chinchiro guides.",
        },
        chooseTable: {
          title: "3. Choose a Table",
          body:
            "Selecting a game shows a list of tables. Each table has a minimum bet, in three tiers: Low Limit, Mid Stakes, and High Roller. To start, Low Limit — where your coins go furthest — is recommended. Tables have a seat capacity; if one is full, you can join in spectate mode.",
        },
        placingBets: {
          title: "4. Place a Bet",
          body:
            "Once seated, decide and confirm your bet. In blackjack you bet at least the table minimum; in chinchiro you bet at least the minimum and no more than one-fifth of your coin balance. Confirming the bet starts the game. Your coin balance is always shown at the top of the screen.",
        },
        controls: {
          title: "5. Take Actions",
          body:
            "During play, the main actions (Hit, Stand, Double, Roll Dice, and so on) are always shown at the bottom of the screen. The actions you can take right now are highlighted, and any button you can't use is grayed out with a reason — so you're never left guessing. Keyboard shortcuts are available too, and the hint bar at the bottom shows which keys are currently active.",
        },
        whenCoinsRunOut: {
          title: "6. When Your Coins Run Low",
          body:
            "Even when coins get tight, there are plenty of ways to earn more: the once-daily daily bonus (up to 500 coins with consecutive logins), three daily challenge rewards, and the free bailout when your coins hit zero (500 coins, or 1000 with an ad). Rather than rushing to chase losses, taking the day off and coming back tomorrow is a healthy way to enjoy the game.",
        },
        progression: {
          title: "7. Things to Chase",
          body:
            "As you keep playing, various long-term goals unlock: 27 achievements, leveling up through experience points, win streaks, a top-10 leaderboard, and nine cosmetics buyable with coins (card, dice, and table decorations). All of these are for enjoying the look and the record — none of them give you a gameplay advantage.",
        },
      },
    },
    contact: {
      title: "Contact",
      intro:
        "For questions, feedback, bug reports, or requests regarding personal information and data deletion concerning SatoriCasino, please reach out through the channel below. The Service is run as an individual's hobby project.",
      sections: {
        howToReach: {
          title: "How to Reach Us",
          body:
            "For inquiries, please use the Issues feature of our GitHub repository.\n\nGitHub Issues: https://github.com/satory074/satoricasino/issues\n\nYou can send anything through the link above — bug reports, feature requests, or questions about the games. There is no dedicated support desk, so a reply may take some time. Thank you for your understanding.",
        },
        operator: {
          title: "About the Operator",
          body:
            "SatoriCasino is a free hobby project developed and operated by an individual. Revenue from advertising (Google AdSense) goes toward operating costs such as server fees.\n\nThe Service deals only in virtual coins and has no functionality for real-money payment, conversion, or withdrawal. There is no mechanism to purchase coins.\n\nInquiries are handled in Japanese or English.",
        },
        otherInquiries: {
          title: "Privacy and Data Deletion",
          body:
            "Requests regarding the handling of personal information and the deletion of your account and associated data are also accepted via the GitHub Issues link above.\n\nFor details on how data is handled, please also see the Privacy Policy page. If you request data deletion, complete removal from backups may take up to 30 days due to technical constraints.",
        },
      },
    },
    glossary: {
      title: "Glossary",
      intro:
        "A glossary of terms used in SatoriCasino and in casino games. It covers general gameplay basics, the specialized vocabulary of blackjack and chinchiro, and the Service's own feature names.",
      sections: {
        general: {
          title: "General Casino & Game Terms",
          body:
            "[Bet] To wager, or the amount wagered.\n\n[House Edge] The percentage that favors the game provider over the long run. The lower it is, the better for the player.\n\n[Jackpot] A high-paying big win. In the Service, blackjack and pinzoro qualify.\n\n[Push / Wakare] A tie; the bet is returned.\n\n[Bankroll] Your available funds (coins).\n\n[RNG (Random Number Generation)] The mechanism that randomly determines dice and cards.\n\n[Virtual Coin] An in-game-only value that cannot be exchanged for cash.",
        },
        blackjackTerms: {
          title: "Blackjack Terms",
          body:
            "[Hit] Add one more card.\n\n[Stand] Lock in without drawing.\n\n[Bust] Going over 21 for a loss.\n\n[Double Down] Double the bet and draw exactly one card.\n\n[Soft Hand] A hand where the Ace can count as 11 without busting.\n\n[Hard Hand] A hand with no Ace, or where the Ace can only count as 1.\n\n[Hole Card] The dealer's face-down card.\n\n[Up Card] The dealer's face-up card.\n\n[Basic Strategy] The guideline for the action with the highest expected value.",
        },
        chinchiroTerms: {
          title: "Chinchiro Terms",
          body:
            "[Banker] The house role facing all children.\n\n[Child (Player)] The side challenging the banker.\n\n[Pinzoro] A triple of ones. The strongest; pays 5x.\n\n[Arashi] A triple of 2-6. Pays 3x.\n\n[Shigoro] 4-5-6. Pays 2x.\n\n[Hifumi] 1-2-3. The weakest; -3x.\n\n[Eye] The leftover number when two dice match.\n\n[Menashi] A state forming no hand.\n\n[Triple] All three dice the same.",
        },
        siteTerms: {
          title: "SatoriCasino Terms & Features",
          body:
            "[Daily Bonus] A login reward claimable once per day; increases with consecutive days.\n\n[Daily Challenge] Three daily objectives, with coin rewards.\n\n[Bailout] A free grant when your coins run out.\n\n[Streak] A win streak record.\n\n[Achievement] An accomplishment unlocked by meeting conditions; 27 in total.\n\n[XP / Level] Experience points and the progression tiers they drive.\n\n[Cosmetics] Decorative items for cards, dice, and tables.\n\n[Spectate Mode] A way to join and watch a game without betting.\n\n[Reaction] Preset stamps you can send at a table (GG and five others).",
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
