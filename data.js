/* ==========================================================
   THE HOUSE — content config
   Edit this file only. Everything on the site reads from here.
   ========================================================== */

window.SITE = {
  name: "Om Kashyap",
  title: "Developer & builder", // TODO: your one-line title
  resumeUrl: "assets/Om_Kashyap_Vedula_Resume.pdf",
  github: "https://github.com/Ketchup-69",
  githubHandle: "@Ketchup-69",
  email: "", // optional: e.g. "you@domain.com" (leave empty to hide)
  linkedin: "https://www.linkedin.com/in/vomkashyap",
  linkedinHandle: "in/vomkashyap",
};

/* Apple Music player (bottom-left widget).
   playlistUrl: link to your Apple Music playlist
   embedUrl:    the embed link (Apple Music > Share > Embed, the iframe "src"),
                e.g. "https://embed.music.apple.com/us/playlist/your-playlist/pl.xxxx"
                When set, the widget plays the playlist right on the site.
   tracks:      what the widget shows. Tapping a track opens it on Apple Music. */
window.MUSIC = {
  title: "The House Mix",
  playlistUrl: "", // TODO
  embedUrl: "", // TODO
  tracks: [
    { title: "Track one", artist: "Artist", url: "" },
    { title: "Track two", artist: "Artist", url: "" },
    { title: "Track three", artist: "Artist", url: "" },
  ],
};

/* Projects = cards on the table. 4–6 works best.
   rank: A K Q J 10 9 ...   suit: spade | heart | diamond | club */
window.PROJECTS = [
  {
    rank: "A",
    suit: "spade",
    title: "Project One",
    blurb: "Placeholder. One or two lines on what it does and why it slaps.",
    stack: ["TypeScript", "Next.js", "Postgres"],
    repo: "https://github.com/Ketchup-69",
    live: "",
  },
  {
    rank: "K",
    suit: "heart",
    title: "Project Two",
    blurb: "Placeholder. The problem, your fix, the result. Keep it tight.",
    stack: ["Python", "FastAPI", "Redis"],
    repo: "https://github.com/Ketchup-69",
    live: "",
  },
  {
    rank: "Q",
    suit: "diamond",
    title: "Project Three",
    blurb: "Placeholder. Lead with the outcome, not the tech list.",
    stack: ["React", "Three.js"],
    repo: "https://github.com/Ketchup-69",
    live: "",
  },
  {
    rank: "J",
    suit: "club",
    title: "Project Four",
    blurb: "Placeholder. What would make a recruiter click this first?",
    stack: ["Go", "Docker", "gRPC"],
    repo: "https://github.com/Ketchup-69",
    live: "",
  },
  {
    rank: "10",
    suit: "diamond",
    title: "Project Five",
    blurb: "Placeholder. Numbers beat adjectives: users, speed, scale.",
    stack: ["Swift", "SwiftUI"],
    repo: "https://github.com/Ketchup-69",
    live: "",
  },
  {
    rank: "9",
    suit: "heart",
    title: "Project Six",
    blurb: "Placeholder. Delete this card if you only want five.",
    stack: ["Rust", "WASM"],
    repo: "https://github.com/Ketchup-69",
    live: "",
  },
];
