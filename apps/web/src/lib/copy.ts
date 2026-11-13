export const copy = {
  siteName: "Many Hands",
  siteDescription:
    "Share what you can do and ask for a hand. Skill sharing, with no money involved.",
  nav: {
    wordmark: "Many Hands",
    home: "Many Hands home",
    skills: "Skills",
    needs: "Needs",
    requests: "Requests",
    me: "Me",
    login: "Log in",
    join: "Join",
    safety: "Staying safe",
    unreadRequests: "unread requests",
    primary: "Main navigation",
    mobile: "Quick navigation",
  },
  footer: {
    moneyFree: "Neighbours helping neighbours. No money involved.",
  },
  landing: {
    eyebrow: "A neighbourhood skill-sharing board",
    title: "Many Hands",
    tagline: "Share what you can do. Ask for a hand. No money involved.",
    intro:
      "Offer a skill, post something you need, and connect with people nearby or online. Help is a gift, not a transaction.",
    join: "Join Many Hands",
    browse: "Browse skills",
    howTitle: "How it works",
    steps: [
      {
        title: "Pin up what you can share",
        text: "List a practical skill, a creative talent, or a little time and know-how.",
      },
      {
        title: "Ask for a hand",
        text: "Post a need, or message someone whose skills fit what you need done.",
      },
      {
        title: "Help, then say thanks",
        text: "Agree on the details together. Afterwards, a public thank-you says it all.",
      },
    ],
    examplesTitle: "A few cards you might see",
    examplesIntro: "These are examples, not real members or posts.",
    exampleLabel: "Example",
    skillKind: "Skill offered",
    needKind: "Help needed",
    examples: [
      {
        id: "example-drywall",
        title: "Patching drywall",
        description: "I can help repair small holes and show you how to get a smooth finish.",
        meta: "In person · Building & Repair",
      },
      {
        id: "example-couch",
        title: "Help moving a couch this Saturday",
        description: "One couch, one flight of stairs. Tea and snacks provided!",
        meta: "This Saturday · In person · Moving & Driving",
      },
      {
        id: "example-logo",
        title: "Sketching a simple logo",
        description: "I can turn your community group's idea into a few hand-drawn logo options.",
        meta: "Remote · Art & Design",
      },
    ],
    safetyNote: "New here? Read our simple safety guide before meeting anyone.",
    safetyLink: "How to stay safe",
  },
  safety: {
    title: "Staying safe",
    intro:
      "Many Hands is built on trust, but a little caution helps everyone. You are always in charge of what you share and whether you meet.",
    notVettedTitle: "Members are not vetted",
    notVetted:
      "Many Hands does not check identities, run background checks, or guarantee members' skills. Take the same care you would with anyone new.",
    meetingTitle: "Meeting in person",
    meetingPoints: [
      "Meet somewhere public first, such as a library, café, or community centre.",
      "Tell someone you trust where you are going and when you expect to be back.",
      "Bring a friend if that would make you more comfortable.",
      "Keep valuables and private documents somewhere safe.",
    ],
    boundariesTitle: "Trust your boundaries",
    boundariesPoints: [
      "It is fine to say no, change your mind, or leave at any time.",
      "Never send money, gift cards, passwords, or banking details through a request.",
      "Keep contact details private until you accept a request and feel comfortable sharing.",
      "Ask questions and agree on what will happen before starting.",
    ],
    reportTitle: "Something not right?",
    report:
      "Use the Report button on a profile, skill, need, request, or thank-you. Reporting needs an account. Moderators review reports in the admin dashboard.",
    urgent: "If you are in immediate danger, contact your local emergency service.",
    adultsOnly: "Many Hands is for adults aged 18 and over.",
  },
  common: {
    skipToContent: "Skip to content",
    comingSoon: "Coming soon",
    comingSoonText: "This part of the board is being built. Check back soon.",
    close: "Close dialog",
    loading: "Searching…",
    noResults: "No places found.",
  },
  stubs: {
    skills: "Skills directory",
    needs: "Needs board",
    newNeed: "Post a need",
    editNeed: "Edit need",
    needDetail: "Need details",
    profile: "Member profile",
    me: "Your profile and posts",
    requests: "Requests inbox",
    login: "Log in",
    signup: "Join Many Hands",
  },
  placePicker: {
    attribution: "Place search by Photon · © OpenStreetMap contributors",
    instructions: "Use the up and down arrows to choose a place, then press Enter.",
    selected: "Selected place",
  },
  distance: {
    nearby: "km away",
    lessThan: "<1 km away",
  },
} as const;
